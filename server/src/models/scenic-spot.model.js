import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const COORDINATE_GOVERNANCE_FIELDS = [
  'latitude',
  'longitude',
  'coordinate_source',
  'coordinate_precision',
  'coordinate_updated_at'
];

export const ScenicSpot = sequelize.define('ScenicSpot', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category_id: {
    type: DataTypes.BIGINT
  },
  cover_image: {
    type: DataTypes.STRING(255)
  },
  gallery_images: {
    type: DataTypes.TEXT
  },
  intro: {
    type: DataTypes.TEXT
  },
  culture_desc: {
    type: DataTypes.TEXT
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
  quote: {
    type: DataTypes.STRING(255)
  },
  best_visit_season: {
    type: DataTypes.STRING(100)
  },
  visit_mode: {
    type: DataTypes.STRING(100)
  },
  pairing_suggestion: {
    type: DataTypes.STRING(255)
  },
  best_light_time: {
    type: DataTypes.STRING(100)
  },
  walking_intensity: {
    type: DataTypes.STRING(50)
  },
  photo_point: {
    type: DataTypes.STRING(255)
  },
  family_friendly: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  open_time: {
    type: DataTypes.STRING(100)
  },
  ticket_info: {
    type: DataTypes.STRING(100)
  },
  suggested_duration: {
    type: DataTypes.STRING(50)
  },
  address: {
    type: DataTypes.STRING(255)
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7)
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7)
  },
  coordinate_source: {
    type: DataTypes.STRING(32)
  },
  coordinate_precision: {
    type: DataTypes.STRING(32)
  },
  coordinate_updated_at: {
    type: DataTypes.DATE
  },
  traffic_guide: {
    type: DataTypes.TEXT
  },
  tips: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.STRING(255)
  },
  recommend_flag: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  hot_score: {
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
  tableName: 'scenic_spots',
  defaultScope: {
    attributes: {
      exclude: COORDINATE_GOVERNANCE_FIELDS
    }
  },
  scopes: {
    withCoordinateGovernance: {
      attributes: {
        include: COORDINATE_GOVERNANCE_FIELDS
      }
    }
  }
});
