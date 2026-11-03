import { HOTELS_URL, HOTELS_KEY } from './supabase';
import { apiCache } from './cache';
import { withRetry } from './retry';
import { Hotel } from '../types';

// Shared mapping of the master hotel list (hotels table in the hotels project), used by every screen that lists hotels.
// Stars come from star_rating; a missing rating falls back to a name-based estimate, as before.
export const mapMasterHotel = (item: any): Hotel => {
    let country = item.country || '';
    const parts = (item.location || item.city_country || '').split(',');
    if (!country && parts.length > 1) {
        country = parts[parts.length - 1].trim();
    } else if (!country) {
        country = 'Indonesia';
    }

    let region = item.region || '';
    if (!region) {
        const countryLower = country.toLowerCase();
        if (countryLower.includes('bahrain') || countryLower.includes('uae') || countryLower.includes('kuwait') || countryLower.includes('saudi') || countryLower.includes('qatar') || countryLower.includes('oman') || countryLower.includes('middle east')) {
            region = 'Middle East';
        } else if (countryLower.includes('indonesia') || countryLower.includes('malaysia') || countryLower.includes('philippines') || countryLower.includes('vietnam') || countryLower.includes('thailand') || countryLower.includes('asia')) {
            region = 'Asia Pacific';
        } else if (countryLower.includes('australia') || countryLower.includes('zealand') || countryLower.includes('oceania')) {
            region = 'Oceania';
        } else {
            region = 'Asia Pacific';
        }
    }

    let stars = item.stars || item.star_rating || item.star_class || item.rating;
    if (!stars) {
        const nameLower = (item.name || item.hotel_name || '').toLowerCase();
        if (nameLower.includes('grand') || nameLower.includes('resort') || nameLower.includes('suites') || nameLower.includes('boutique') || nameLower.includes('seef')) {
            stars = 5;
        } else if (nameLower.includes('inn') || nameLower.includes('express')) {
            stars = 3;
        } else {
            stars = 4;
        }
    }

    const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
    const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
    const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();

    return {
        id: finalId,
        name: item.name || item.hotel_name || '',
        location: item.location || item.city_country || '',
        code: item.code || '',
        brandClass: item.brandClass || item.brand_class || item.brand || 'Swiss-Belhotel',
        region,
        country,
        stars: Number(stars) || 4
    };
};

// Fetches the master hotel list once per cache window, retrying temporary network failures
export const fetchMasterHotels = (forceRefresh = false): Promise<Hotel[]> =>
    apiCache.getOrFetch<Hotel[]>('hotels_master_rows', () => withRetry(async () => {
        const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
            headers: {
                'apikey': HOTELS_KEY,
                'Authorization': `Bearer ${HOTELS_KEY}`
            }
        });
        if (!response.ok) {
            const error: any = new Error(`Failed to load hotels: HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Unexpected response when loading hotels');
        }
        return data.map(mapMasterHotel);
    }), { forceRefresh });
