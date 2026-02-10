const localStorage = require('../../utils/localStorage.js');

Page({
  data: {
    groupedTags: [],
    showModal: false,
    modalTitle: '',
    modalType: '', // 'attribute' or 'size'
    isEditMode: false,
    inputValue: '', // For attribute options
    newField: { key: '', placeholder: '' }, // For size fields
    editingTagId: null,
    editingFieldKey: null,
  },

  onShow() {
    this.loadTags();
  },

  async loadTags() {
    wx.showLoading({ title: '加载中...' });
    try {
      const allTags = localStorage.getTags();
      const managedTags = allTags.filter(tag => tag.field !== 'season'); // Filter out hardcoded season tag
      this.groupTags(managedTags);
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载标签失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  groupTags(tags) {
    const groupMap = {
      'attribute': '衣物属性',
      'size': '尺寸'
    };
    const grouped = Object.values(groupMap).map(groupName => ({ groupName, tags: [] }));
    tags.forEach(tag => {
      const groupName = groupMap[tag.type];
      const group = grouped.find(g => g.groupName === groupName);
      if (group) group.tags.push(tag);
    });
    const attributeGroup = grouped.find(g => g.groupName === '衣物属性');
    if (attributeGroup) {
      const attributeOrder = ['袖型', '领型', '下裙类型', '配饰类型'];
      attributeGroup.tags.sort((a, b) => attributeOrder.indexOf(a.name) - attributeOrder.indexOf(b.name));
    }
    this.setData({ groupedTags: grouped });
  },

  // --- Modal Control ---
  hideModal() { this.setData({ showModal: false }); },
  onModalInput(e) {
    const { key } = e.currentTarget.dataset;
    if (this.data.modalType === 'attribute') {
      this.setData({ inputValue: e.detail.value });
    } else if (this.data.modalType === 'size') {
      this.setData({ [`newField.${key}`]: e.detail.value });
    }
  },
  showAddModal(e) {
    const { tag } = this.findTagAndIndices(e.currentTarget.dataset.tagId);
    if (!tag) return;
    this.setData({ showModal: true, isEditMode: false, modalType: tag.type, modalTitle: `新增 - ${tag.name}`, editingTagId: tag.id, inputValue: '', newField: { key: '', placeholder: '' } });
  },
  showEditModal(e) {
    const { tagId, fieldKey } = e.currentTarget.dataset;
    const { tag } = this.findTagAndIndices(tagId);
    if (!tag) return;
    const field = tag.fields.find(f => f.key === fieldKey);
    this.setData({ showModal: true, isEditMode: true, modalType: 'size', modalTitle: `编辑 - ${field.key}`, editingTagId: tagId, editingFieldKey: fieldKey, newField: { key: field.key, placeholder: field.placeholder } });
  },

  // --- Core Logic ---
  async handleModalConfirm() {
    const { isEditMode, modalType, editingTagId, editingFieldKey, newField, inputValue } = this.data;
    if (isEditMode) {
      if (modalType === 'size') await this.updateSizeField(editingTagId, editingFieldKey, newField.placeholder);
    } else {
      if (modalType === 'attribute') await this.addAttributeOption(editingTagId, inputValue);
      else if (modalType === 'size') await this.addSizeField(editingTagId, newField);
    }
    this.hideModal();
  },

  async addAttributeOption(tagId, option) {
    if (!option) return wx.showToast({ title: '选项名不能为空', icon: 'none' });
    const { tag } = this.findTagAndIndices(tagId);
    if (tag.options && tag.options.includes(option)) return wx.showToast({ title: '选项已存在', icon: 'none' }); // Check if options exists
    wx.showLoading({ title: '更新中...' });
    try {
      localStorage.addTagOption(tagId, option);
      wx.hideLoading();
      wx.showToast({ title: '更新成功' });
      this.loadTags();
    } catch (err) {
      wx.hideLoading();
      console.error('更新失败', err);
      wx.showToast({ title: `更新失败: ${err.message}`, icon: 'none' });
    }
  },

  async addSizeField(tagId, field) {
    if (!field.key) return wx.showToast({ title: '字段名不能为空', icon: 'none' });
    const { tag } = this.findTagAndIndices(tagId);
    if (tag.fields && tag.fields.some(f => f.key === field.key)) return wx.showToast({ title: '字段名已存在', icon: 'none' }); // Check if fields exists
    wx.showLoading({ title: '更新中...' });
    try {
      localStorage.addTagField(tagId, field);
      wx.hideLoading();
      wx.showToast({ title: '更新成功' });
      this.loadTags();
    } catch (err) {
      wx.hideLoading();
      console.error('更新失败', err);
      wx.showToast({ title: `更新失败: ${err.message}`, icon: 'none' });
    }
  },

  async updateSizeField(tagId, fieldKey, newPlaceholder) {
    const { tag } = this.findTagAndIndices(tagId);
    const fieldIndex = tag.fields.findIndex(f => f.key === fieldKey);
    if (fieldIndex === -1) return;
    wx.showLoading({ title: '更新中...' });
    try {
      localStorage.updateTagFieldPlaceholder(tagId, fieldKey, newPlaceholder);
      wx.hideLoading();
      wx.showToast({ title: '更新成功' });
      this.loadTags();
    } catch (err) {
      wx.hideLoading();
      console.error('更新失败', err);
      wx.showToast({ title: `更新失败: ${err.message}`, icon: 'none' });
    }
  },

  handleDeleteOption(e) {
    const { tagId, option } = e.currentTarget.dataset;
    wx.showModal({ title: '确认删除', content: `删除后将无法恢复，确定要删除选项 "${option}" 吗？`, success: async res => {
      if (res.confirm) {
        wx.showLoading({ title: '删除中...' });
        try {
          localStorage.deleteTagOption(tagId, option);
          wx.hideLoading();
          wx.showToast({ title: '删除成功' });
          this.loadTags();
        } catch (err) {
          wx.hideLoading();
          console.error('删除失败', err);
          wx.showToast({ title: `删除失败: ${err.message}`, icon: 'none' });
        }
      }
    } });
  },

  handleDeleteField(e) {
    const { tagId, fieldKey } = e.currentTarget.dataset;
    wx.showModal({ title: '确认删除', content: `删除后将无法恢复，确定要删除字段 "${fieldKey}" 吗？`, success: async res => {
      if (res.confirm) {
        wx.showLoading({ title: '删除中...' });
        try {
          localStorage.deleteTagField(tagId, fieldKey);
          wx.hideLoading();
          wx.showToast({ title: '删除成功' });
          this.loadTags();
        } catch (err) {
          wx.hideLoading();
          console.error('删除失败', err);
          wx.showToast({ title: `删除失败: ${err.message}`, icon: 'none' });
        }
      }
    } });
  },

  // --- DB & Helpers ---


  findTagAndIndices(tagId) {
    for (let i = 0; i < this.data.groupedTags.length; i++) {
      const group = this.data.groupedTags[i];
      for (let j = 0; j < group.tags.length; j++) {
        if (group.tags[j].id === tagId) { // Use tag.id
          return { groupIndex: i, tagIndex: j, tag: group.tags[j] };
        }
      }
    }
    return { tag: null };
  },

  goToImportPage() {
    wx.navigateTo({
      url: '/pages/data-import/data-import'
    });
  }
});
