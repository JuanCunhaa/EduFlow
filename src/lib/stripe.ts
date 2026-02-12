/**
 * Stripe SDK singleton for server-side usage.
 * Lazy-initialized to avoid crashes at build time when env vars are unavailable.
 */

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (_stripe) return _stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not set');
    }

    _stripe = new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    });

    return _stripe;
}
