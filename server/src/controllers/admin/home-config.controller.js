import { sendSuccess } from '../../utils/response.js';
import {
  getAdminHomeConfigDetail,
  updateAdminHomeConfig
} from '../../services/admin-home-config.service.js';

export async function detail(req, res, next) {
  try {
    const result = await getAdminHomeConfigDetail();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await updateAdminHomeConfig(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
