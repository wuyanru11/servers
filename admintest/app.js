import Koa from "koa"
import serve from "koa-static2"
import logger from "koa-logger"
import Router from "koa-router"
import jwt from 'koa-jwt'
import cors from 'koa2-cors'
import koaBody from 'koa-body'
import dbcontroller from "./db/dbcontroller"
import path from "path"


const app = new Koa()
const router = new Router()

app.use(cors())


app.use(koaBody())
app.use(logger())
app.use(serve("", path.join(__dirname, 'public')))

//login
router.get('/:db/api/:table', dbcontroller.all)

router.post('/:db/api/:table', dbcontroller.add)
router.put('/:db/api/:table/:id', dbcontroller.modify)
router.delete('/:db/api/:table/:id', dbcontroller.remove)
router.get('/:db/deletes/:table/', dbcontroller.deletes)
router.get('/:db/count/:table/', dbcontroller.count)
router.post('/login/', dbcontroller.login)
router.get('/loginuser/', dbcontroller.loginuser)


app.use(router.routes())
app.listen(8899)
console.log('listen:8899')