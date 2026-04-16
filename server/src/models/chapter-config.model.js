import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const ChapterConfig = sequelize.define('ChapterConfig', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  chapter_code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  chapter_title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  chapter_subtitle: {
    type: DataTypes.STRING(255)
  },
  chapter_intro: {
    type: DataTypes.TEXT
  },
  hero_image: {
    type: DataTypes.STRING(255)
  },
  hero_caption: {
    type: DataTypes.STRING(255)
  },
  route_label: {
    type: DataTypes.STRING(100)
  },
  mood_tone: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'amber'
  },
  sort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  created_at: {
    type: DataTypes.DATE
  },
  updated_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'chapter_configs'
});
