Page({
  login() {
    wx.login({
      success: ({ code }) => {
        wx.showToast({ title: code ? "已取得登录凭证" : "登录失败", icon: code ? "success" : "none" });
      },
    });
  },
});
