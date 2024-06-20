import { Schema, model } from 'mongoose'
// 引入套件validator，用於驗證資料
import validator from 'validator'

// 定義每筆使用者的資料要放哪些欄位
const schema = new Schema({
  // 設定資料欄位名稱
  account: {
    // 設定資料型態
    type: String,
    // 必填
    required: [true, '帳號必填'],
    // 文字長度
    minLength: [4, '帳號最少4個字'],
    maxLength: [20, '帳號最長20個字'],
    // 欄位資料不可重複註冊
    unique: true,
    // Regax
    match: [/^[A-Za-z1-9]+$/, '帳號只能是英數字'],
    // 自動使用 文字.trim() 去除前後空白
    trim: true
  },
  email: {
    // 設定資料型態
    type: String,
    // 必填
    required: [true, '信箱必填'],
    // 不可重複註冊
    unique: true,
    // 自訂驗證
    validator: {
      // 自訂驗證functoion
      validator (value) {
        // .isEmail()來自套件validator
        return validator.isEmail(value)
      },
      //  自訂驗證錯誤訊息
      message: '信箱格式錯誤'
    }
  }
})

// 將資料結構轉成可以操作的 model 物件匯出
// model(collection名稱, schema)
export default model('users', schema)
