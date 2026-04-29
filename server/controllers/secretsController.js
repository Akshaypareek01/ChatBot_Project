/**
 * Secrets Vault REST controller.
 *
 * Endpoints (mounted under /api/users/secrets, all auth-required):
 *   GET    /                       list all secrets (metadata only)
 *   POST   /                       create new secret { name, value, description? }
 *   PATCH  /:id                    rotate / update description { value?, description? }
 *   DELETE /:id                    delete secret
 *
 * Plaintext is never returned by any endpoint.
 */

const secretsVault = require('../services/secretsVault.service');

const listSecrets = async (req, res) => {
    try {
        const secrets = await secretsVault.listSecrets(req.userId);
        return res.status(200).json({ secrets });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createSecret = async (req, res) => {
    try {
        const { name, value, description } = req.body || {};
        if (!name || !value) {
            return res.status(400).json({ message: 'name and value are required' });
        }
        const secret = await secretsVault.createSecret(req.userId, {
            name,
            value,
            description,
        });
        return res.status(201).json(secret);
    } catch (error) {
        const isClientError =
            /already exists|required|must be|not configured/i.test(error.message || '');
        return res
            .status(isClientError ? 400 : 500)
            .json({ message: error.message || 'Failed to create secret' });
    }
};

const updateSecret = async (req, res) => {
    try {
        const { value, description } = req.body || {};
        if (value === undefined && description === undefined) {
            return res.status(400).json({ message: 'Nothing to update' });
        }
        const updated = await secretsVault.updateSecret(req.userId, req.params.id, {
            value,
            description,
        });
        if (!updated) return res.status(404).json({ message: 'Secret not found' });
        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteSecret = async (req, res) => {
    try {
        const ok = await secretsVault.deleteSecret(req.userId, req.params.id);
        if (!ok) return res.status(404).json({ message: 'Secret not found' });
        return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    listSecrets,
    createSecret,
    updateSecret,
    deleteSecret,
};
