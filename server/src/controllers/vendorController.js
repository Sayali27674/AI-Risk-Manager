const prisma = require('../models/prisma');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function pagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

async function getVendors(req, res, next) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const search = String(req.query.search || '').trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [vendors, total] = await prisma.$transaction([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          category: true,
          country: true,
          riskLevel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return res.json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorById(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        country: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
        transactions: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            timestamp: true,
            riskScore: {
              select: {
                score: true,
                riskLevel: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    return res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}

async function createVendor(req, res, next) {
  try {
    const { name, category, country, riskLevel = 'LOW' } = req.body;

    if (!name?.trim() || !category?.trim() || !country?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and country are required',
      });
    }

    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!validRiskLevels.includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk level',
      });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        country: country.trim(),
        riskLevel,
      },
    });

    return res.status(201).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Vendor already exists',
      });
    }

    next(error);
  }
}

async function updateVendor(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const { name, category, country, riskLevel } = req.body;
    const data = {};

    if (name !== undefined) data.name = String(name).trim();
    if (category !== undefined) data.category = String(category).trim();
    if (country !== undefined) data.country = String(country).trim();

    if (riskLevel !== undefined) {
      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(riskLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid risk level',
        });
      }

      data.riskLevel = riskLevel;
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Vendor already exists',
      });
    }

    next(error);
  }
}

async function deleteVendor(req, res, next) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const transactionCount = await prisma.transaction.count({
      where: { vendorId: id },
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a vendor with transactions',
      });
    }

    await prisma.vendor.delete({ where: { id } });

    return res.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
};