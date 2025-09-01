const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext(); // 获取调用者的OpenID
  const { tagId, action, payload } = event;
  const ADMIN_OPENID = require('./config.js').adminOpenID; // 从配置文件读取

  // 权限校验：检查调用者是否是管理员
  if (OPENID !== ADMIN_OPENID) {
    return { success: false, message: '无权操作，仅管理员可修改标签' };
  }

  if (!tagId || !action) {
    return { success: false, message: '缺少必要参数 tagId 或 action' };
  }

  let updateData = {};

  try {
    // 根据客户端发来的action，在云端构造正确的数据库指令
    switch (action) {
      case 'PUSH_OPTION':
        updateData = { options: _.push(payload) };
        break;
      case 'PULL_OPTION':
        updateData = { options: _.pull(payload) };
        break;
      case 'PUSH_FIELD':
        updateData = { fields: _.push(payload) };
        break;
      case 'PULL_FIELD':
        updateData = { fields: _.pull({ key: payload }) };
        break;
      case 'UPDATE_FIELD': // 用于更新单个字段，例如修改placeholder
        updateData = payload; // payload此时是 { 'fields.0.placeholder': 'new value' }
        break;
      default:
        return { success: false, message: '无效的操作' };
    }

    await db.collection('tags').doc(tagId).update({
      data: updateData
    });

    return { success: true, message: '更新成功' };

  } catch (e) {
    console.error('更新标签失败', e);
    return {
      success: false,
      message: `数据库更新失败: ${e.errMsg || e.message}`,
      error: e
    };
  }
};
