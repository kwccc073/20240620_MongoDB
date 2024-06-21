import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import User from './user.js'
import { StatusCodes } from 'http-status-codes' // 用於將HTTP狀態碼改寫寫成status（方便閱讀）
import validator from 'validator'

// 連線到資料庫
mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log('資料庫連線成功')
  })
  .catch((error) => {
    console.log('資料庫連線失敗')
    console.error(error)
  })
// 建立網頁伺服器
// express()的語法順序會有影響
const app = express()

// 將傳入的body解析為json，才能處理post請求
app.use(express.json())
// 處理express.json的錯誤
/* 處理 middleware的錯誤一定要有四個參數 error, req, rew, next
   req, res處理請求
   next = 繼續下一步處理
   error = 錯誤訊息
   _表示忽略參數不用 */
app.use((_, req, res, next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: '資料格式錯誤'
  })
})

// 處理新增（請求為post）
// app.請求方式(路徑,處理function)
// req = 進來的，res = 出去的
// 處理function通常用async
app.post('/', async (req, res) => {
  try {
    console.log(req.body)
    /* 另一種寫法
    const user = new User({
      accout: req.body.accout,
      emali: req.body.emali
    })
    await user.save()
    */
    /* 另一種寫法
    const user = await User.create({
      accout: req.body.accout,
      emali: req.body.emali
    })
    */

    // user為建立完的資料
    // create()用來新增新的資料，會需要一段時間故用await
    const user = await User.create(req.body)

    // 回傳(res.json)只能出現一次，超過一個會出現錯誤
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: user
    })
  } catch (error) {
    console.log(error)
    // 終端機顯示錯誤MomgoServerError，且錯誤代碼為E11000，表示有東西重複
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // 資料重複 unique錯誤
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號或信箱重複'
      })
    } else if (error.name === 'ValidationError') {
      // 驗證錯誤
      // 第一個驗證失敗的欄位名稱
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
})

app.get('/', async (req, res) => {
  try {
    // .find()裡面是寫查詢條件，不寫就是查詢全部
    const result = await User.find()

    res.status(StatusCodes.OK).json({
      success: false,
      message: '',
      result
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
})

// 查詢
app.get('/:id', async (req, res) => {
  console.log('id', req.params.id)
  console.log('query', req.query)
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    /* 其他寫法
    const user = await User.find({ _id: req.params.id})
    const user = await User.findOne({ _id: req.params.id}) */
    const user = await User.findById(req.params.id)

    // 拋出錯誤
    // 找不到使用者的情況
    if (!user) throw new Error('NOT FOUND')

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: user
    })
  } catch (error) {
    // 如果mongoDB的id格式不正確時
    if (error.name === 'CattError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無資料'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
})

app.delete('/:id', async (req, res) => {
  try {
    // 跟ID有關的就有可逢發生格式錯誤
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const user = await User.findByIdAndUpdate(req.params.od)

    if (!user) throw Error('NOT FOUND')

    res.status(StatusCodes.OK).json({
      success: false,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CattError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無資料'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
})

// put 整組換掉
// patch 部分換掉
app.patch('/:id', async (req, res) => {
  try {
    // 跟ID有關的就有可逢發生格式錯誤
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')
    // new:true 設定回傳更新後的資料
    // runValidators: true 執行schema 定義的驗證
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

    // 找不到使用者的情況
    if (!user) throw new Error('NOT FOUND')

    // 回傳更新後的資訊
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: user
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '格式錯誤'
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      // 資料重複 unique 錯誤
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號或信箱重複'
      })
    } else if (error.name === 'ValidationError') {
      // 驗證錯誤
      // 第一個驗證失敗的欄位名稱
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無資料'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
})

app.listen(process.env.PORT || 4000, () => {
  console.log('伺服器啟動')
})
