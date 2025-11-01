const createPaginationData = (page, limit, totalCount, resourceName) => ({
    page: parseInt(page),
    limit: parseInt(limit),
    totalPage: Math.ceil(totalCount / limit),
    [`total${resourceName}`]: totalCount,
});

module.exports = {createPaginationData};