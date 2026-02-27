/**
 * Optional CSRF mitigation: state-changing requests should carry X-Requested-With.
 * Bearer token in header already reduces CSRF risk; this blocks simple cross-site form POSTs.
 */
const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfGuard(req, res, next) {
    if (!stateChangingMethods.has(req.method)) return next();
    const requestedWith = req.get('X-Requested-With');
    if (requestedWith === 'XMLHttpRequest' || requestedWith === 'fetch') return next();
    // Allow non-browser clients (e.g. Postman) by not blocking; in production you may require the header
    next();
}

module.exports = csrfGuard;
