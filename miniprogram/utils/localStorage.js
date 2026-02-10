// miniprogram/utils/localStorage.js
const STORAGE_KEYS = {
  CLOTHES: 'my_closet_clothes',
  OUTFITS: 'my_closet_outfits',
  TAGS: 'my_closet_tags',
};

const getDefaultData = (key) => {
  switch (key) {
    case STORAGE_KEYS.CLOTHES:
      return [];
    case STORAGE_KEYS.OUTFITS:
      return [];
    case STORAGE_KEYS.TAGS:
      return [];
    default:
      return [];
  }
};

// Generic function to get all items for a given key
const getAllItems = (key) => {
  try {
    const data = wx.getStorageSync(key);
    return data || getDefaultData(key);
  } catch (e) {
    console.error(`Error getting data for key ${key}:`, e);
    return getDefaultData(key);
  }
};

// Generic function to save all items for a given key
const saveAllItems = (key, items) => {
  try {
    wx.setStorageSync(key, items);
  } catch (e) {
    console.error(`Error saving data for key ${key}:`, e);
  }
};

// Generic function to add an item
const addItem = (key, newItem) => {
  const items = getAllItems(key);
  if (!newItem.id) { // Only generate new ID if not provided (e.g., for new items added in app)
    newItem.id = Date.now().toString() + Math.random().toString(36).substr(2, 5); // Simple unique ID
  }
  items.push(newItem);
  saveAllItems(key, items);
  return newItem;
};

// Generic function to update an item
const updateItem = (key, updatedItem) => {
  const items = getAllItems(key);
  const index = items.findIndex(item => item.id === updatedItem.id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updatedItem };
    saveAllItems(key, items);
    return true;
  }
  return false;
};

// Generic function to delete an item by id
const deleteItem = (key, id) => {
  let items = getAllItems(key);
  const initialLength = items.length;
  items = items.filter(item => item.id !== id);
  saveAllItems(key, items);
  return items.length < initialLength;
};

// Specific functions for Clothes
const getClothes = () => getAllItems(STORAGE_KEYS.CLOTHES);
const addClothes = (newClothes) => addItem(STORAGE_KEYS.CLOTHES, newClothes);
const updateClothes = (updatedClothes) => updateItem(STORAGE_KEYS.CLOTHES, updatedClothes);
const deleteClothes = (id) => deleteItem(STORAGE_KEYS.CLOTHES, id);

// Specific functions for Outfits
const getOutfits = () => getAllItems(STORAGE_KEYS.OUTFITS);
const addOutfit = (newOutfit) => addItem(STORAGE_KEYS.OUTFITS, newOutfit);
const updateOutfit = (updatedOutfit) => updateItem(STORAGE_KEYS.OUTFITS, updatedOutfit);
const deleteOutfit = (id) => deleteItem(STORAGE_KEYS.OUTFITS, id);

// Specific functions for Tags
const getTags = () => getAllItems(STORAGE_KEYS.TAGS);
const addTag = (newTag) => addItem(STORAGE_KEYS.TAGS, newTag);
const updateTag = (updatedTag) => updateItem(STORAGE_KEYS.TAGS, updatedTag);
const deleteTag = (id) => deleteItem(STORAGE_KEYS.TAGS, id);

// Granular functions for Tags
const addTagOption = (tagId, option) => {
  const tags = getAllItems(STORAGE_KEYS.TAGS);
  const tagIndex = tags.findIndex(tag => tag.id === tagId);
  if (tagIndex !== -1) {
    if (!tags[tagIndex].options) {
      tags[tagIndex].options = [];
    }
    if (!tags[tagIndex].options.includes(option)) {
      tags[tagIndex].options.push(option);
      saveAllItems(STORAGE_KEYS.TAGS, tags);
      return true;
    }
  }
  return false;
};

const deleteTagOption = (tagId, option) => {
  const tags = getAllItems(STORAGE_KEYS.TAGS);
  const tagIndex = tags.findIndex(tag => tag.id === tagId);
  if (tagIndex !== -1 && tags[tagIndex].options) {
    const initialLength = tags[tagIndex].options.length;
    tags[tagIndex].options = tags[tagIndex].options.filter(opt => opt !== option);
    if (tags[tagIndex].options.length < initialLength) {
      saveAllItems(STORAGE_KEYS.TAGS, tags);
      return true;
    }
  }
  return false;
};

const addTagField = (tagId, field) => {
  const tags = getAllItems(STORAGE_KEYS.TAGS);
  const tagIndex = tags.findIndex(tag => tag.id === tagId);
  if (tagIndex !== -1) {
    if (!tags[tagIndex].fields) {
      tags[tagIndex].fields = [];
    }
    if (!tags[tagIndex].fields.some(f => f.key === field.key)) {
      tags[tagIndex].fields.push(field);
      saveAllItems(STORAGE_KEYS.TAGS, tags);
      return true;
    }
  }
  return false;
};

const updateTagFieldPlaceholder = (tagId, fieldKey, newPlaceholder) => {
  const tags = getAllItems(STORAGE_KEYS.TAGS);
  const tagIndex = tags.findIndex(tag => tag.id === tagId);
  if (tagIndex !== -1 && tags[tagIndex].fields) {
    const fieldIndex = tags[tagIndex].fields.findIndex(f => f.key === fieldKey);
    if (fieldIndex !== -1) {
      tags[tagIndex].fields[fieldIndex].placeholder = newPlaceholder;
      saveAllItems(STORAGE_KEYS.TAGS, tags);
      return true;
    }
  }
  return false;
};

const deleteTagField = (tagId, fieldKey) => {
  const tags = getAllItems(STORAGE_KEYS.TAGS);
  const tagIndex = tags.findIndex(tag => tag.id === tagId);
  if (tagIndex !== -1 && tags[tagIndex].fields) {
    const initialLength = tags[tagIndex].fields.length;
    tags[tagIndex].fields = tags[tagIndex].fields.filter(f => f.key !== fieldKey);
    if (tags[tagIndex].fields.length < initialLength) {
      saveAllItems(STORAGE_KEYS.TAGS, tags);
      return true;
    }
  }
  return false;
};

module.exports = {
  getClothes,
  addClothes,
  updateClothes,
  deleteClothes,
  getOutfits,
  addOutfit,
  updateOutfit,
  deleteOutfit,
  getTags,
  addTag,
  updateTag,
  deleteTag,
  addTagOption,
  deleteTagOption,
  addTagField,
  updateTagFieldPlaceholder,
  deleteTagField,
  STORAGE_KEYS, // Export for potential migration or debugging
};
