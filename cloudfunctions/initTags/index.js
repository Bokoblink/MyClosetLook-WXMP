const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 定义所有需要初始化的标签数据
const tagsData = [
  // --- 属性 ---
  {
    _id: 'season_definition',
    name: '季节',
    field: 'season',
    category: ['上衣', '下裙', '配饰'],
    type: 'attribute',
    options: ['夏', '春秋', '冬']
  },
  {
    _id: 'sleeveType_definition',
    name: '袖型',
    field: 'sleeveType',
    category: ['上衣'],
    type: 'attribute',
    options: ['弓袋袖', '飞机袖', '半袖', '比甲', '吊带']
  },
  {
    _id: 'collarType_definition',
    name: '领型',
    field: 'collarType',
    category: ['上衣'],
    type: 'attribute',
    options: ['方领', '圆领', '直领', '交领']
  },
  {
    _id: 'skirtType_definition',
    name: '类型',
    field: 'skirtType',
    category: ['下裙'],
    type: 'attribute',
    options: ['马面', '百迭', '旋裙', '破裙', '其他']
  },
  {
    _id: 'accessoryType_definition',
    name: '类型',
    field: 'accessoryType',
    category: ['配饰'],
    type: 'attribute',
    options: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针']
  },
  // --- 尺寸 ---
  {
    _id: 'top_size_definition',
    name: '上衣尺寸',
    category: ['上衣'],
    type: 'size',
    fields: [
      { "key": "尺码", "placeholder": "例如: M / L / 均码" },
      { "key": "衣长", "placeholder": "例如: 70cm" },
      { "key": "胸围", "placeholder": "例如: 120cm" },
      { "key": "通袖", "placeholder": "例如: 180cm" },
      { "key": "领围", "placeholder": "例如: 40cm" },
      { "key": "袖口", "placeholder": "例如: 30cm" },
      { "key": "袖根", "placeholder": "例如: 50cm" }
    ]
  },
  {
    _id: 'bottom_size_definition',
    name: '下裙尺寸',
    category: ['下裙'],
    type: 'size',
    fields: [
      { "key": "尺码", "placeholder": "例如: M / L / 均码" },
      { "key": "裙长", "placeholder": "例如: 100cm" },
      { "key": "腰围", "placeholder": "例如: 70cm" },
      { "key": "裙门", "placeholder": "例如: 20cm" },
      { "key": "裙腰长", "placeholder": "例如: 100cm" },
      { "key": "摆围", "placeholder": "例如: 3m" }
    ]
  }
];

// 云函数入口函数
exports.main = async (event, context) => {
  const tagsCollection = db.collection('tags');

  try {
    let totalAdded = 0;
    let totalUpdated = 0;

    const promises = tagsData.map(async (tag) => {
      const docId = tag._id;
      // 关键修正：创建一个不包含 _id 的新对象用于写入
      const dataToWrite = { ...tag };
      delete dataToWrite._id;

      // 使用 set 方法，如果文档存在则完全覆盖，不存在则创建
      const result = await tagsCollection.doc(docId).set({
        data: dataToWrite
      });
      
      if (result.stats.created > 0) {
        totalAdded++;
      } else if (result.stats.updated > 0) {
        totalUpdated++;
      }
    });

    await Promise.all(promises);

    return {
      success: true,
      message: `初始化完成。新增 ${totalAdded} 个，更新 ${totalUpdated} 个标签定义。`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: '初始化标签失败',
      error: e
    };
  }
};