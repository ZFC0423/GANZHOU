import { Op } from 'sequelize';
import { Article, Category } from '../models/index.js';
import { enhanceArticleView } from '../utils/front-view-models.js';
import { getActiveChapterConfigMap } from '../utils/content-config.js';

function parseStringList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatArticleItem(item, chapterConfigMap = {}) {
  const categoryCode = item.category?.code || '';

  return enhanceArticleView({
    id: item.id,
    title: item.title,
    categoryId: item.category_id,
    categoryName: item.category?.name || '',
    categoryCode,
    coverImage: item.cover_image,
    summary: item.summary,
    quote: item.quote,
    content: item.content,
    source: item.source,
    author: item.author,
    tags: parseStringList(item.tags),
    recommendFlag: item.recommend_flag,
    viewCount: item.view_count,
    status: item.status,
    createdAt: item.created_at,
    chapterMeta: chapterConfigMap[categoryCode] || null
  });
}

export async function getArticleList(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.max(Number(query.pageSize) || 10, 1);
  const offset = (page - 1) * pageSize;
  const where = { status: 1 };
  const categoryWhere = { status: 1, type: 'article' };

  if (query.keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.keyword}%` } },
      { summary: { [Op.like]: `%${query.keyword}%` } },
      { tags: { [Op.like]: `%${query.keyword}%` } }
    ];
  }

  if (query.categoryCode) {
    categoryWhere.code = query.categoryCode;
  }

  const [chapterConfigMap, result] = await Promise.all([
    getActiveChapterConfigMap(),
    Article.findAndCountAll({
      where,
      distinct: true,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'code'],
          where: categoryWhere
        }
      ],
      order: [['recommend_flag', 'DESC'], ['id', 'DESC']],
      offset,
      limit: pageSize
    })
  ]);

  return {
    list: result.rows.map((item) => formatArticleItem(item, chapterConfigMap)),
    total: result.count,
    page,
    pageSize
  };
}

export async function getArticleDetail(id) {
  const article = await Article.findOne({
    where: {
      id,
      status: 1
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  if (!article) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  await article.increment('view_count', { by: 1 });
  await article.reload({
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  const [chapterConfigMap, relatedRows] = await Promise.all([
    getActiveChapterConfigMap(),
    Article.findAll({
      where: {
        id: { [Op.ne]: id },
        category_id: article.category_id,
        status: 1
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ],
      order: [['recommend_flag', 'DESC'], ['id', 'DESC']],
      limit: 3
    })
  ]);

  const articleDetail = formatArticleItem(article, chapterConfigMap);

  return {
    ...articleDetail,
    relatedList: relatedRows.map((item) => formatArticleItem(item, chapterConfigMap)),
    readingRoom: {
      heading: 'Read the context before moving on',
      description: articleDetail.curatorNote || articleDetail.summary || ''
    }
  };
}
