// components/floating-button/floating-button.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    onTap() {
      // 触发父组件的自定义事件，让父页面自己决定做什么
      this.triggerEvent('tap');
    }
  }
})