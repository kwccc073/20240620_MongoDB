import 'dotenv/config' // 引入環境變數
import express from 'express' // 網頁伺服器
import mongoose from 'mongoose'
import User from './user.js' // 引入model，請求會用到
import { StatusCodes } from 'http-status-codes' // 用於將HTTP狀態碼改寫寫成status（方便閱讀，就不用記數字對應的status）
import validator from 'validator'

// 連線到資料庫--------------------------
mongoose.connect(process.env.DB_URL)
  // promise => 所以要寫.then() （也可以用await，但寫法較複雜）
  .then(() => {
    console.log('資料庫連線成功')
  })
  // 這是當出現錯誤時要執行的
  .catch((error) => {
    console.log('資料庫連線失敗')
    console.error(error)
  })

// 建立網頁伺服器（作為API server）-----------------------------------------------
// express()的語法順序會有影響
const app = express()

// Middleware 是伺服器處理請求和回應的中間層--------------------------------------------------
// express.json()將傳入的body解析為json ***一定要先解析，才能處理請求***
app.use(express.json())
// 處理express.json的錯誤，如果上面這行有錯才會進行下方程式碼
/* 處理 middleware的錯誤一定要有四個參數 error, req, rew, next
    error = 前一個middleware發生的錯誤
    req, res => 處理請求
    next = 繼續下一步處理（有next就是middleware），沒有呼叫next會卡住

    error寫了eslint會要你處理，所以用_表示忽略參數不用 */
app.use((_, req, res, next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: '資料格式錯誤'
  })
})

/* app.請求方式(路徑,function)------------------------------------------------------------
   function 通常會用 async(req, res)=>{}，因為要對伺服器/資料庫做操作，一定會有延遲
   req => request 進來的
   res => response 出去的 */

// 新增（請求為post）-------------------------------------------------------------------
app.post('/', async (req, res) => {
  try {
    console.log(req.body)
    /* 參考：https://mongoosejs.com/docs/models.html
     寫法一：.create() 是mongoose的語法
     const user = await User.create()
     寫法二：物件導向
     const user = new User()
     user.save()
    */

    // user為建立完的資料
    // create()用來新增新的資料，會需要一段時間故用await
    // 直接把請求之body傳入，mongoose會自動做資料的驗證，若body出現資料庫沒有的欄位也不會幫你新增，會自動踢掉
    const user = await User.create(req.body)

    /* 下面這個寫法是一項一項寫
    const user = await User.create({
      accout: req.body.accout,
      emali: req.body.emali
    })
    */

    /*
    res.status() => 設定狀態碼
    res.json() => 回應的JSON
    可以簡寫成res.status().json()
    一個請求只能寫一次res.status().json()
    */
    // 回傳(res.json)只能出現一次，超過一個會出現錯誤
    res.status(StatusCodes.OK).json({
      success: true, // 這次操作是否成功
      message: '', // 錯誤訊息
      result: user // 結果－這裡是建立的user，操作有成功才會有result
    })
  } catch (error) {
    console.log(error)
    // 資料重複（unique錯誤） => 終端機顯示錯誤MomgoServerError，且錯誤代碼為E11000--------------
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // 各自判斷比較麻煩，這裡不作各自判斷
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號或信箱重複'
      })

      // 驗證錯誤（例如：帳號規定4個字但使用者只打3個字、Email沒有加@-----------------------------
    } else if (error.name === 'ValidationError') {
      // 若有多個錯誤，這裡只抓出第一個錯誤
      // 取出第一個驗證失敗的欄位名稱與錯誤訊息 => key、message
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message // 這個會是你在schema定義的錯誤訊息

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

// 查詢（請求為get）-------------------------------------------------------------------
// 取全部---------------------------
app.get('/', async (req, res) => {
  try {
    // mongoose語法參考說明：https://mongoosejs.com/docs/api/model.html
    // .find()裡面是寫查詢條件，不寫就是查詢全部
    // 找到的所有東西會形成一個陣列（這裡的result）
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

// 取單個---------------------------
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

// 刪除（請求為delete）-------------------------------------------------------------------
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

// 修改（請求為patch`)-------------------------------------------------------------------
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

// 伺服器.listen(port, [hostname], [callback])
// port => 埠號：用來區分同一台機器上的不同服務
// []表示不一定需要
// hostname => 指定伺服器要監聽的網路位址，預設為 localhost；如果希望伺服器可被外網訪問，可以設置為 0.0.0.0
// callback => 伺服器啟動後執行的回呼函數，通常用於顯示伺服器已啟動的提示。
app.listen(process.env.PORT || 4000, () => {
  console.log('伺服器啟動')
})
