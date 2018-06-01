import { MongoClient } from 'mongodb'
import dbunit from './dbunit.js'
import jwt from 'koa-jwt'
import _ from 'lodash'

class dbcontroller {
  //数据
  async all(ctx) {
    let success = true
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let querybase64 = ctx.query.q
    let filterObj = null
    let data = []
    let count = 0
    try {
      filterObj = JSON.parse(Buffer.from(querybase64, 'base64').toString())
      //success = filterObj.s
    } catch (error) {

    }
    if (success) {
      let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
      let collection = db.collection(paramstable)
      let options = []
      let findmatch = false
      if (filterObj.a) {
        filterObj.a.forEach((element) => {
          let obj = {}
          let type = '$' + element.type
          obj[type] = element.data || {}
          dbunit.changeModelId(obj[type])
          if (type == '$project') {
            obj[type]._id = 1
          }
          if (type == '$match') {
            findmatch = true
            obj[type]['_delete'] = { '$ne': true }
          }
          options.push(obj)
        })
      }
      if (!findmatch) {
        let obj = {}
        obj['$match'] = {}
        obj['$match']['_delete'] = { '$ne': true }
        options.push(obj)
      }
      options.push({ $group: { _id: null, count: { $sum: 1 } } })
      let cursor = collection.aggregate(options)
      let group = await cursor.toArray()
      if (group && group.length > 0) {
        count = group[0].count
      }
      options.pop()

      let limit = Number.parseInt(filterObj.prepage || 30)
      let skip = Number.parseInt(filterObj.page || 0) * limit
      let sort = filterObj.sort || { '_id': -1 }

      options.push({ '$sort': sort })
      options.push({ '$skip': skip })
      options.push({ '$limit': limit })
      console.log(options)
      let tablecursor = collection.aggregate(options)
      data = await tablecursor.toArray()

      db.close()
    }
    let nowtime = new Date().getTime()
    console.log('111',data)
    ctx.body = await {
      'data': data,
      'count': count,
      'table': paramstable,
      'nowtime': nowtime
    }
  }
  static getimgurl(obj, imgarray, objarray) {
    _.forEach(obj, (value, key) => {
      if (_.isString(key) && key.indexOf('img_id') >= 0) {
        if (_.isArray(value)) {
          value.forEach((item) => {
            if (_.find(imgarray, item.toString())) {

            } else {
              imgarray.push(item)
            }
          })
        } else if (_.find(imgarray, value.toString())) {
        } else {
          imgarray.push(value)
        }
        objarray.push({ obj, key })
      } else if (_.isObject(obj[key])) {
        dbcontroller.getimgurl(obj[key], imgarray, objarray)
      }
    })
  }
  async allmore(ctx) {
    let success = false
    let paramsdb = null
    let querybase64 = ctx.query.q
    let paramsdbname = {}
    let datastr = {}
    let filterObjs = null
    try {
      // 将请求的数据进行解码
      filterObjs = JSON.parse(Buffer.from(querybase64, 'base64').toString())
      paramsdb = filterObjs.dball
      success = filterObjs.s
      paramsdbname = filterObjs.db
    } catch (error) {
      console.log(error)
    }
    if (success) {
      let db = await MongoClient.connect(dbunit.getDBStr(paramsdbname))
      let imgarray = []
      let objarray = []
      for (let item in paramsdb) {
        console.log(paramsdb[item])
        let paramstablename = paramsdb[item].table
        let filterObj = paramsdb[item].a
        let subopt = paramsdb[item].b
        let sort = paramsdb[item].sort || { '_id': -1 }
        let limit = Number.parseInt(paramsdb[item].prepage || 30)
        let skip = Number.parseInt(paramsdb[item].page || 0) * limit
        let collection = db.collection(paramstablename)
        let options = []
        let findmatch = false
        if (filterObj) {
          filterObj.forEach((element) => {
            let obj = {}
            let type = '$' + element.type
            obj[type] = element.data || {}
            dbunit.changeModelId(obj[type])
            if (type == '$project') {
              obj[type]._id = 1
              obj[type]._delete = 1
            }
            if (type == '$match') {
              findmatch = true
              obj[type]['_delete'] = { '$ne': true }
            }
            options.push(obj)
          })
        }
        if (!findmatch) {
          let obj = {}
          obj['$match'] = {}
          obj['$match']['_delete'] = { '$ne': true }
          options.push(obj)
        }
        if (subopt) {
          let inarray = []
          let submatch = {}
          submatch['$match'] = {}
          if (datastr[subopt.index]) {
            datastr[subopt.index].data.forEach(iditem => {
              inarray.push(dbunit.getObjectID(iditem[subopt.oid]))
            })
          }
          submatch['$match'][subopt.sid] = { '$in': inarray }
          dbunit.changeModelId(submatch['$match'])
          options.push(submatch)
        }

        options.push({ $group: { _id: null, count: { $sum: 1 } } })
        let cursor = collection.aggregate(options)
        let group = await cursor.toArray()
        let count = 0
        if (group && group.length > 0) {
          count = group[0].count
        }
        console.log(count)
        options.pop()
        options.push({ '$sort': sort })
        options.push({ '$skip': skip })
        options.push({ '$limit': limit })
        console.log(options, sort)
        let tablecursor = collection.aggregate(options)
        let data = []
        data = await tablecursor.toArray()
        dbcontroller.getimgurl(data, imgarray, objarray)
        datastr[item] = {
          data,
          'count': count,
          'table': paramstablename
        }
        //console.log(datastr[item], imgarray, objarray)
      }
      if (imgarray.length > 0) {
        let collection = db.collection('images')
        let options = []
        let objproject = {}
        let submatch = {}
        objproject['$project'] = { fileurl: true, _id: true }
        submatch['$match'] = {}
        submatch['$match']['_id'] = { '$in': imgarray }
        dbunit.changeModelId(submatch['$match'])

        options.push(objproject)
        options.push(submatch)
        let tablecursor = collection.aggregate(options)
        let data = []
        data = await tablecursor.toArray()
        console.log(data, imgarray)
        objarray.forEach((item) => {
          let itemobj = item.obj
          let itemkey = item.key
          let itemimg = itemkey.replace('_id', '')
          if (_.isArray(itemobj[itemkey])) {
            itemobj[itemimg] = []
            itemobj[itemkey].forEach((imgid) => {
              console.log(itemobj[itemkey], imgid)
              let imgobj = _.find(data, { _id: imgid })
              if (imgobj) {
                itemobj[itemimg].push('http://' + imgobj.fileurl)
              }
            })
          } else {
            //console.log(item, itemobj[itemkey], itemkey)
            let imgobj = _.find(data, { _id: itemobj[itemkey] })
            if (imgobj) {
              itemobj[itemimg] = 'http://' + imgobj.fileurl
            }
          }
        })
      }
      db.close()
    }
    let nowtime = new Date().getTime()
    console.log(datastr)
    ctx.body = await {
      'data': datastr,
      'nowtime': nowtime
    }
  }

  async add(ctx) {
    let model = ctx.request.body
    console.log('model11', model)
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    let seqid = await db.collection('lb_seq_id').findOneAndUpdate({ id: paramstable }, { $inc: { seq: 1 } }, { upsert: true })
    model.lbseqid = seqid.seq
    dbunit.changeModelId(model)
    console.log(model)
    let inserted = await collection.insert(model)
    if (!inserted) {
      this.throw(405, 'The model couldn\'t be added.')
    }
    db.close()
    ctx.body = await model
  }

  async modify(ctx) {
    let model = ctx.request.body
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let id = ctx.params.id
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    dbunit.changeModelId(model)
    let result = await collection.updateOne({ '_id': dbunit.getObjectID(id) }, {
      $set: model
    })
    db.close()
    ctx.body = result
  }

  async remove(ctx) {
    let model = ctx.request.body
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let id = ctx.params.id
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    let removed = await collection.updateOne({ '_id': dbunit.getObjectID(id) }, { $set: { '_delete': true } })
    db.close()
    if (!removed) {
      ctx.throw(405, 'Unable to delete.')
    } else {
      ctx.body = '{"success":1}'
    }
  }

  async deletes(ctx) {
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)

    let findobj = {}
    for (let item in this.query) {
      let value = this.query[item]
      if (value == 'true') {
        findobj[item] = true
      } else if (value == 'false') {
        findobj[item] = false
      } else {
        findobj[item] = this.query[item]
      }
    }
    dbunit.changeModelId(findobj)
    let count = await collection.updateMany(findobj, { $set: { '_delete': true } })
    db.close()

    ctx.body = count
  }

  async count(ctx) {
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)

    let findobj = {}
    for (let item in this.query) {
      let value = this.query[item]
      if (value == 'true') {
        findobj[item] = true
      } else if (value == 'false') {
        findobj[item] = false
      } else {
        findobj[item] = this.query[item]
      }
    }
    findobj['_delete'] = { '$ne': true }
    console.log(table, findobj, this.query)
    dbunit.changeModelId(findobj)
    let count = await collection.find(findobj).count()
    db.close()

    ctx.body = count
  }

  loginuser(user) {
    return new Promise((resolve) => {
      let logindata = { 'login': false }
      MongoClient.connect(dbunit.getdbstr('luban8')).then(db => {
        let table = db.collection('user')
        let options = []
        options.push({
          '$match': {
            'pwd': user.pwd,
            'phone': user.user,
            'lock': false,
            '_delete': { '$ne': true }
          }
        })
        options.push({ '$limit': 1 })
        let cursor = table.aggregate(options)
        cursor.toArray().then(obj => {
          if (obj.length > 0) {
            logindata.login = true
            logindata.user = obj[0].phone
            logindata.name = obj[0].name
            logindata.admin = obj[0].admin
            logindata.db = obj[0].db
            logindata._id = obj[0]._id
            resolve(logindata)
          } else {
            resolve(logindata)
          }
          db.close()
        })
      })
    })
  }
  async login(ctx) {
    console.log('heheheheh')
    let user = ctx.request.body
    var dbmodel = await loginuser(user)
    var token = ''
    var code = -1
    var message = '登录失败'
    if (dbmodel.login) {
      token = jwt.sign(dbmodel, 'nanguo', { expiresIn: 60 * 60 * 24 * 30 })
      code = 0
      message = '登录成功'
    }

    let nowtime = new Date().getTime()
    this.body = {
      code,
      token,
      message,
      account: dbmodel,
      nowtime
    }
  }

  async fetch(ctx) {
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)
    console.log(dbunit.getObjectID(id))
    let model = await collection.find({ '_id': dbunit.getObjectID(id) }).toArray()
    if (model.length === 0) {
      ctx.throw(404, 'model with _id = ' + id + ' was not found')
    }
    db.close()
    ctx.body = await model
  }

  async bulkWrite(ctx) {
    let model = ctx.request.body
    let paramsdb = ctx.params.db
    let paramstable = ctx.params.table
    let db = await MongoClient.connect(dbunit.getDBStr(paramsdb))
    let collection = db.collection(paramstable)

    let writeobj = []
    model.forEach((element) => {
      dbunit.changeModelId(element)
      let opt = {}
      if (element._id) {
        if (element._delete) {
          opt.updateOne = {
            filter: { '_id': element._id }
            , update: { $set: { '_delete': true } }
          }
        } else {
          opt.updateOne = {
            filter: { '_id': element._id }
            , update: { $set: element }
          }
        }
      } else {
        opt.insertOne = {
          document: element
        }
      }
      writeobj.push(opt)
    })
    let result = await collection.bulkWrite(writeobj)
    db.close()
    ctx.body = result
  }

  async options() {
    this.set('Access-Control-Allow-Method', 'HEAD,GET,PUT,DELETE,OPTIONS')
    this.set('Access-Control-Allow-Origin', '*')
    this.status = 204
    this.body = await 'Allow: HEAD,GET,PUT,DELETE,OPTIONS'
  }

  async trace() {
    this.body = await 'Smart! But you can\'t trace.'
  }


}
export default new dbcontroller()