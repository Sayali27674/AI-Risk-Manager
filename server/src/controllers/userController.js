const userService = require('../services/userService');

async function listUsers(req, res, next) {
  try {
    const { page, limit } = userService.parsePagination(req.query);
    const { search, role } = userService.parseUserFilters(req.query);
    const result = await userService.listUsers({ page, limit, search, role });
    return res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserStats(req, res, next) {
  try {
    const data = await userService.getUserStats();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserStats,
};
