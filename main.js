// 第 1 小步：只验证一条链路 —— 页面能打开、JS 能挂上事件。
// 真正的「生成桌宠」逻辑留到下一步，这里先不写。

const createPetBtn = document.querySelector('#createPetBtn')

createPetBtn.addEventListener('click', () => {
  console.log('按钮已点通，下一步接桌宠生成逻辑')
})
