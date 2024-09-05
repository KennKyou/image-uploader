# GitHub 圖片上傳器

這是一個基於 Vue 3 的 GitHub 圖片上傳器元件，讓使用者能夠輕鬆地將圖片上傳到指定的 GitHub 儲存庫中。

## 功能

- 使用 GitHub Token 進行身分驗證
- 支援拖放或點擊上傳圖片
- 可選的圖片壓縮功能
- 顯示已上傳圖片清單
- 複製圖片網址和 Markdown 格式的連結
- 支援刪除已上傳的圖片
- 響應式設計，支援行動裝置
- GitHub Token 安全儲存於瀏覽器的 localStorage

## 使用方式

1. 請確保您已經在 GitHub 上建立了一個名為 `MyPicture` 的公開儲存庫。

2. 取得 GitHub Personal Access Token：
   - 前往 GitHub 設定頁面
   - 選擇 "Developer settings" > "Personal access tokens" > "Tokens (classic)"
   - 產生新的 token，務必勾選 `repo` 權限

3. 在應用程式中設定您的 GitHub Token：
   - 點擊 "設定 Token" 按鈕
   - 在跳出的對話框中輸入您的 GitHub Token
   - 點擊 "儲存" 按鈕

4. 上傳圖片：
   - 拖放圖片到上傳區域或點擊選擇檔案
   - 如有需要，可以啟用圖片壓縮功能
   - 點擊 "上傳到 GitHub" 按鈕

5. 管理已上傳的圖片：
   - 查看已上傳圖片清單
   - 複製圖片網址或 Markdown 格式的連結
   - 刪除不需要的圖片

## 使用技術

- Vue 3
- Element Plus
- Axios
- browser-image-compression

## 注意事項

- 請務必妥善保管您的 GitHub Token，切勿分享給他人。
- 雖然 Token 儲存在 localStorage 中相對安全，但在使用公共電腦時請記得登出或清除瀏覽器資料。
- 上傳的圖片將儲存在您指定的 GitHub 儲存庫中，請注意管理儲存庫容量。
- 僅支援圖片檔案的上傳，其他類型的檔案可能無法正常處理。