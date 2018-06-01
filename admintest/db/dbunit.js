import mongodb from 'mongodb'

class dbunit {
    constructor() {
        this.dbstr = 'mongodb://127.0.0.1/'
    }
    static checkId(id) {
        let result = false
        if (id && (id.length == 12 || id.length == 24)) {
            result = true
        }
        return result
    }
    getDBStr(db) {
        let dbtemp = "test"
        if (db && db.length > 0) {
            dbtemp = db
        }
        return this.dbstr + dbtemp
    }
    getObjectID(id) {
        return mongodb.ObjectID(id)
    }
    static changeArrayModelId(model) {
        for (var item in model) {
            if (typeof model[item] === 'object') {
                dbunit.changeArrayModelId(model[item])
            } else {
                if (typeof model[item] == 'string') {
                    if (dbunit.checkId(model[item])) {
                        console.log(model[item])
                        let monkid = mongodb.ObjectID(model[item])
                        model[item] = monkid
                    }
                }
            }
        }
    }
    changeModelId(model) {
        for (var item in model) {
            if (typeof item == 'string') {
                if (item.indexOf('_id') >= 0) {
                    try {
                        if (typeof model[item] === 'object') {
                            dbunit.changeArrayModelId(model[item])
                        } else {
                            if (typeof model[item] == 'string') {
                                if (dbunit.checkId(model[item])) {
                                    console.log(model[item])
                                    let monkid = mongodb.ObjectID(model[item])
                                    model[item] = monkid
                                }
                            }

                        }
                    } catch (e) {
                        console.log(e)
                    }
                }
            }
        }
    }
}
export default new dbunit()