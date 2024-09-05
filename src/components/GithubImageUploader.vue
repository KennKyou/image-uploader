<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { UploadFilled, Delete, Document, CopyDocument, RefreshRight, InfoFilled, Key } from '@element-plus/icons-vue'
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const showTokenDialog = ref(false)
const newGithubToken = ref('')
const hasExistingToken = computed(() => !!githubToken.value)

const file = ref(null);
const previewUrl = ref('');
const isUploading = ref(false);
const uploadedUrl = ref('');
const githubToken = ref('');
const githubUsername = ref('');
const githubRepo = ref('MyPicture');
const uploadedImages = ref([]);
const repoExists = ref(false);
const enableCompression = ref(false);
const uploadRef = ref(null);
const saveToken = ref(false);
const currentPage = ref(1);
const pageSize = 10;
const isMobile = ref(false);

const openTokenDialog = () => {
  showTokenDialog.value = true
  newGithubToken.value = ''
}

const saveLocalToken = () => {
  if (newGithubToken.value) {
    authStore.saveGithubToken(newGithubToken.value)
    githubToken.value = newGithubToken.value
    ElMessage.success('GitHub Token 已更新')
    showTokenDialog.value = false
    newGithubToken.value = ''
    fetchUserInfo() // 重新獲取用戶資訊
  } else {
    ElMessage.warning('請輸入有效的 GitHub Token')
  }
}

const removeLocalToken = () => {
  ElMessageBox.confirm('確定要刪除保存的 GitHub Token 嗎？', '警告', {
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    authStore.removeGithubToken()
    githubToken.value = ''
    newGithubToken.value = ''
    ElMessage.success('GitHub Token 已刪除')
    showTokenDialog.value = false
    resetUserInfo() // 重置用戶資訊
  }).catch(() => {})
}

const handleFileChange = (uploadFile) => {
  clearUpload();
  if (uploadFile && uploadFile.raw) {
    file.value = uploadFile.raw;
    previewUrl.value = URL.createObjectURL(uploadFile.raw);
  }
};

const resetUserInfo = () => {
  githubUsername.value = ''
  repoExists.value = false
  uploadedImages.value = []
}

const fetchUserInfo = async () => {
  if (!githubToken.value) {
    resetUserInfo()
    return
  }
  
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${githubToken.value}` }
    });
    githubUsername.value = response.data.login;
    
    try {
      await axios.get(`https://api.github.com/repos/${githubUsername.value}/${githubRepo.value}`, {
        headers: { Authorization: `token ${githubToken.value}` }
      });
      repoExists.value = true;
      fetchUploadedImages();
    } catch (error) {
      repoExists.value = false;
      uploadedImages.value = []
      ElMessage.warning('請創建一個名為 MyPicture 的 Public Repository');
    }
  } catch (error) {
    console.error('獲取使用者資訊失敗', error);
    ElMessage.error('獲取 GitHub 使用者資訊失敗');
    resetUserInfo()
  }
};

const fetchUploadedImages = async () => {
  if (!githubToken.value || !githubUsername.value || !repoExists.value) return;

  try {
    const response = await axios.get(`https://api.github.com/repos/${githubUsername.value}/${githubRepo.value}/contents/images`, {
      headers: { Authorization: `token ${githubToken.value}` },
      params: { timestamp: new Date().getTime() }
    });
    uploadedImages.value = response.data
      .filter(file => file.type === 'file')
      .map(file => ({
        name: decodeURIComponent(file.name),
        url: file.download_url,
        size: file.size,
        sha: file.sha
      }));
      // console.log('獲取到的圖片列表', uploadedImages.value);
  } catch (error) {
    console.error('獲取已上傳圖片失敗', error);
    if (error.response && error.response.status === 404) {
      uploadedImages.value = [];
    } else {
      ElMessage.error('獲取已上傳圖片失敗');
    }
  }
};

const compressImage = async (imageFile) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedBlob = await imageCompression(imageFile, options);
    return new File([compressedBlob], imageFile.name, { type: compressedBlob.type });
  } catch (error) {
    console.error('圖片壓縮失敗', error);
    ElMessage.error('圖片壓縮失敗');
    return null;
  }
};

const clearUpload = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
  file.value = null;
  // 清除預覽圖
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
};

const generateUniqueFileName = (originalName) => {
  const fileExtension = originalName.split('.').pop();
  const uniqueId = uuidv4().slice(0, 8);
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}.${fileExtension}`;
};

const uploadToGithub = async () => {
  if (!file.value) {
    ElMessage.warning('請先選擇圖片');
    return;
  }

  if (!githubToken.value || !githubUsername.value || !repoExists.value) {
    ElMessage.warning('請確保已輸入有效的 GitHub Token 並創建了 MyPicture Repository');
    return;
  }

  isUploading.value = true;
  let fileToUpload = file.value;

  if (enableCompression.value) {
    const compressedFile = await compressImage(file.value);
    if (compressedFile) {
      fileToUpload = compressedFile;
    } else {
      isUploading.value = false;
      return;
    }
  }

  const uniqueFileName = generateUniqueFileName(fileToUpload.name);

  const reader = new FileReader();
  reader.readAsDataURL(fileToUpload);
  reader.onload = async () => {
    const base64Data = reader.result.split(',')[1];
    
    try {
      const encodedFileName = encodeURIComponent(uniqueFileName);
      const uploadData = {
        message: 'Upload image via Vue app',
        content: base64Data
      };

      const uploadResponse = await axios.put(
        `https://api.github.com/repos/${githubUsername.value}/${githubRepo.value}/contents/images/${encodedFileName}`,
        uploadData,
        {
          headers: {
            Authorization: `token ${githubToken.value}`,
            'Content-Type': 'application/json'
          }
        }
      );

      uploadedUrl.value = uploadResponse.data.content.download_url;
      ElMessage.success('圖片上傳成功');
      clearUpload();
      await fetchUploadedImages();
      // console.log('圖片列表已更新', uploadedImages.value);
    } catch (error) {
      console.error('上傳失敗', error);
      if (error.response) {
        console.error('錯誤響應:', error.response.data);
      }
      ElMessage.error(`圖片上傳失敗: ${error.message}`);
    } finally {
      isUploading.value = false;
    }
  };
};

const copyImageUrl = (url, type = 'url') => {
  let textToCopy = url;
  if (type === 'markdown') {
    const fileName = url.split('/').pop();
    textToCopy = `![${fileName}](${url})`;
  }
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    ElMessage.success(`圖片${type === 'markdown' ? ' Markdown ' : ' '}URL 已複製到剪貼板`);
  }, (err) => {
    console.error('複製失敗', err);
    ElMessage.error('複製圖片 URL 失敗');
  });
};

const markdownUrl = computed(() => {
  if (!uploadedUrl.value) return '';
  const fileName = uploadedUrl.value.split('/').pop();
  return `![${fileName}](${uploadedUrl.value})`;
});

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const deleteImage = async (image) => {
  try {
    await ElMessageBox.confirm(
      `確定要刪除圖片 "${image.name}" 嗎？`,
      '警告',
      {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await axios.delete(
      `https://api.github.com/repos/${githubUsername.value}/${githubRepo.value}/contents/images/${encodeURIComponent(image.name)}`,
      {
        headers: { Authorization: `token ${githubToken.value}` },
        data: {
          message: `Delete image ${image.name}`,
          sha: image.sha
        }
      }
    );

    if (response.status === 200) {
      ElMessage.success('圖片刪除成功');
      await fetchUploadedImages();
      // console.log('圖片列表已更新', uploadedImages.value);
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('刪除圖片失敗', error);
      ElMessage.error(`刪除圖片失敗: ${error.message || '未知錯誤'}`);
    }
  }
};

const paginatedImages = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return uploadedImages.value.slice(startIndex, endIndex);
});

const totalPages = computed(() => Math.ceil(uploadedImages.value.length / pageSize));

const handlePageChange = (page) => {
  currentPage.value = page;
};

const loadSavedToken = () => {
  const savedToken = localStorage.getItem('githubToken');
  if (savedToken) {
    githubToken.value = savedToken;
    saveToken.value = true;
  }
};

const handleSaveTokenChange = () => {
  if (saveToken.value) {
    ElMessageBox.confirm(
      '儲存 GitHub Token 可能會有安全風險。請確保您的設備是安全的，並且不要在公共或共享的設備上使用此功能。您確定要儲存 Token 嗎？',
      '安全警告',
      {
        confirmButtonText: '確定儲存',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      localStorage.setItem('githubToken', githubToken.value);
    }).catch(() => {
      saveToken.value = false;
    });
  } else {
    localStorage.removeItem('githubToken');
  }
};

const clearToken = () => {
  githubToken.value = '';
  saveToken.value = false;
  localStorage.removeItem('githubToken');
};

watch(githubToken, (newValue) => {
  if (saveToken.value) {
    localStorage.setItem('githubToken', newValue);
  }
});

watch(saveToken, handleSaveTokenChange);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  const savedToken = authStore.getGithubToken()
  if (savedToken) {
    githubToken.value = savedToken
    fetchUserInfo()
  } else {
    ElMessage.warning('請設置您的 GitHub Token')
  }
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<template>
  <div class="github-uploader">

    <div class="uploader-section">
      <div class="card-header">
        <el-button @click="openTokenDialog" :type="hasExistingToken ? 'success' : 'warning'" :icon="Key">
          {{ hasExistingToken ? '管理 Token' : '設置 Token' }}
        </el-button>
      </div>

      <el-alert
        v-if="!repoExists"
        title="請創建一個名為 MyPicture 的 Public Repository"
        type="warning"
        :closable="false"
        class="repo-alert"
      />

      <el-switch
        v-model="enableCompression"
        active-text="啟用壓縮"
        inactive-text="不壓縮"
        class="compression-switch"
      />

      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        accept="image/*"
        :show-file-list="false"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖曳圖片到此處或 <em>點擊上傳</em>
        </div>
      </el-upload>

      <div v-if="previewUrl" class="image-preview">
        <img :src="previewUrl" alt="預覽圖" />
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="uploadToGithub" :loading="isUploading" :disabled="!repoExists || !file" class="upload-button">
          {{ isUploading ? '上傳中...' : '上傳到 GitHub' }}
        </el-button>
        <el-button type="warning" @click="clearUpload" :icon="RefreshRight" :disabled="!file" class="clear-button">
          清除文件
        </el-button>
      </div>

      <div v-if="uploadedUrl" class="uploaded-result">
        <h3>上傳成功</h3>
        <div class="url-section">
          <p>圖片 URL：</p>
          <el-input v-model="uploadedUrl" readonly>
            <template #append>
              <el-button @click="copyImageUrl(uploadedUrl)">
                <el-icon><Document /></el-icon>
                複製
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="markdown-section">
          <p>Markdown 格式：</p>
          <el-input v-model="markdownUrl" readonly>
            <template #append>
              <el-button @click="copyImageUrl(uploadedUrl, 'markdown')">
                <el-icon><Document /></el-icon>
                複製
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>

    <div class="image-list-section">
      <h3 class="section-title">已上傳的圖片</h3>
      <div v-if="isMobile" class="mobile-image-list">
        <div v-for="image in paginatedImages" :key="image.url" class="mobile-image-item">
          <el-image 
            class="preview-image"
            :src="image.url" 
            fit="cover"
            :preview-src-list="[image.url]"
            preview-teleported
          />
          <div class="mobile-image-info">
            <span>{{ formatFileSize(image.size) }}</span>
          </div>
          <div class="mobile-image-actions">
            <el-button type="primary" size="small" @click="copyImageUrl(image.url)" :icon="Document">
              複製 URL
            </el-button>
            <el-button type="info" size="small" @click="copyImageUrl(image.url, 'markdown')" :icon="CopyDocument">
              複製 Markdown
            </el-button>
            <el-button type="danger" size="small" @click="deleteImage(image)" :icon="Delete">
              刪除
            </el-button>
          </div>
        </div>
      </div>
      <el-table v-else :data="paginatedImages" style="width: 100%">
        <el-table-column label="預覽" width="150">
          <template #default="scope">
            <el-image 
              class="preview-image"
              :src="scope.row.url" 
              fit="cover"
              :preview-src-list="[scope.row.url]"
              preview-teleported
            />
          </template>
        </el-table-column>
        <el-table-column label="容量" width="100">
          <template #default="scope">
            {{ formatFileSize(scope.row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button-group>
              <el-button 
                type="primary" 
                size="small" 
                @click="copyImageUrl(scope.row.url)"
                :icon="Document"
              >
                複製 URL
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="copyImageUrl(scope.row.url, 'markdown')"
                :icon="CopyDocument"
              >
                複製 Markdown
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteImage(scope.row)"
                :icon="Delete"
              >
                刪除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="totalPages > 1">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="uploadedImages.length"
          @current-change="handlePageChange"
          layout="prev, pager, next"
        />
      </div>
    </div>

    <el-dialog
      v-model="showTokenDialog"
      :title="hasExistingToken ? '更新 GitHub Token' : '設置 GitHub Token'"
      :fullscreen="isMobile"
      :close-on-click-modal="false"
    >
      <p class="token-info">
        您的 GitHub Token 將使用安全的加密方法儲存在您的本地設備上。
        這確保了即使他人訪問您的設備，也無法輕易獲取您的 Token。
        請注意，Token 僅在當前瀏覽器中有效，清除瀏覽器數據將導致 Token 丟失。
      </p>
      <el-form label-position="top">
        <el-form-item>
          <template #label>
            <div style="display: flex; align-items: center;">
              <span>{{ hasExistingToken ? '新的 GitHub Token' : 'GitHub Token' }}</span>
              <el-tooltip
                class="token-info-tooltip"
                effect="dark"
                content="GitHub Token 需要具有 repo 權限，以允許讀取和寫入儲存庫內容。"
                placement="top-start"
              >
                <el-icon class="info-icon"><info-filled /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <el-input 
            v-model="newGithubToken" 
            type="password" 
            placeholder="請輸入您的 GitHub Token"
            show-password
          />
        </el-form-item>
      </el-form>
      <el-link href="https://www.kyoudesu.com/note/obsidian/Obsidian%20Git%20%E8%88%87%20Android%20%E8%A3%9D%E7%BD%AE%E9%80%B2%E8%A1%8C%E5%90%8C%E6%AD%A5.html#%E4%B8%89%E3%80%81github-%E7%9A%84-token-%E8%A8%AD%E5%AE%9A" target="_blank" rel="noopener noreferrer">如何獲取 GitHub Token？</el-link>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTokenDialog = false">取消</el-button>
          <el-button type="primary" @click="saveLocalToken">
            {{ hasExistingToken ? '更新' : '保存' }}
          </el-button>
          <el-button v-if="hasExistingToken" type="danger" @click="removeLocalToken">
            刪除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.github-uploader {
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /* margin: 0 auto; */
}

.page-title {
  margin-bottom: 20px;
  color: #409EFF;
  font-size: 1.5rem;
}

.uploader-section, .image-list-section {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.section-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: #409EFF;
  font-size: 1.2rem;
}

.card-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
}

.repo-alert {
  margin-bottom: 20px;
  border-radius: 4px;
}

.compression-switch {
  margin-bottom: 20px;
}

.upload-area {
  margin-bottom: 20px;
  border-radius: 6px;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #409EFF;
}

.image-preview {
  margin-top: 20px;
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.upload-button {
  flex-grow: 1;
}

.uploaded-result {
  margin-top: 20px;
  padding: 20px;
  background-color: #f0f9ff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.uploaded-result h3 {
  margin-top: 0;
  color: #409EFF;
  font-size: 18px;
}

.url-section, .markdown-section {
  margin-top: 15px;
}

.url-section p, .markdown-section p {
  margin-bottom: 5px;
  font-weight: bold;
  color: #606266;
}

.el-input {
  margin-bottom: 10px;
}

.el-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.el-input :deep(.el-input-group__append) {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

.el-input :deep(.el-input-group__append:hover) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

.el-table {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.el-button-group {
  display: flex;
  gap: 5px;
}

.preview-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.preview-image:hover {
  transform: scale(1.05);
}

.el-table :deep(.el-table__row) {
  transition: background-color 0.3s;
}

.el-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-button {
  transition: transform 0.2s, box-shadow 0.2s;
}

.el-button:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.el-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.mobile-image-list {
  display: none;
}

.token-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f0f9ff;
  border-left: 4px solid #409EFF;
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
}

.info-icon {
  margin-left: 5px;
  font-size: 16px;
  color: #909399;
  cursor: pointer;
}

@media (max-width: 768px) {
  .github-uploader {
    padding: 10px;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .compression-switch {
    margin-left: 0;
    margin-top: 10px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .el-button {
    margin-left: 0;
    width: 100%;
  }

  .el-button + .el-button {
    margin-left: 0;
  }

  .el-table {
    display: none;
  }

  .mobile-image-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .mobile-image-item {
    border: 1px solid #EBEEF5;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }

  .mobile-image-item .preview-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .mobile-image-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #606266;
  }

  .mobile-image-actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .mobile-image-actions .el-button {
    width: 100%;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 10px;
  }

  .dialog-footer .el-button {
    width: 100%;
    margin-bottom: 10px;
  }

  :deep(.el-overlay-dialog) {
    padding: 20px;
  }

  :deep(.el-dialog) {
    width: 100% !important;
    max-width: none;
  }

  :deep(.el-dialog__header) {
    padding: 15px;
  }

  :deep(.el-dialog__body) {
    padding: 15px;
  }

  :deep(.el-dialog__footer) {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  .preview-image {
    height: 150px;
  }
}
</style>