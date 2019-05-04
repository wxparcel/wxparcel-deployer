export class User {
  private islogin: boolean

  get isLogin () {
    return this.islogin
  }

  constructor () {
    this.islogin = false
  }

  public login () {
    this.islogin = true
  }

  public logout () {
    this.islogin = false
  }
}

export default new User()
