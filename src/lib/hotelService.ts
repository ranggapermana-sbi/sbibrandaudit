import { supabase, HOTELS_URL, HOTELS_KEY } from './supabase';
import { Hotel } from '../types';
import { HARDCODED_TEST_HOTELS, DEFAULT_HOTELS } from './constants';
import { apiCache } from './cache';

export async function fetchHotelsWithFallback(): Promise<Hotel[]> {
    return await apiCache.getOrFetch<Hotel[]>('all_hotels_master_cache', async () => {
        let rawData: any[] = [];

        // 1. Attempt primary HOTELS_URL REST endpoint
        try {
            const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                headers: {
                    'apikey': HOTELS_KEY,
                    'Authorization': `Bearer ${HOTELS_KEY}`
                }
            });
            if (response.ok) {
                const json = await response.json();
                if (Array.isArray(json) && json.length > 0) {
                    rawData = json;
                }
            }
        } catch (e) {
            console.warn("HOTELS_URL endpoint unreachable, using main database fallback:", e);
        }

        // 2. Database fallback: Query audit_users from primary Supabase instance
        if (rawData.length === 0) {
            try {
                const { data: usersData, error } = await supabase
                    .from('audit_users')
                    .select('hotel_id, hotel_name, hotel_code');

                if (!error && Array.isArray(usersData) && usersData.length > 0) {
                    const map = new Map<string, any>();
                    usersData.forEach((u: any) => {
                        const name = u.hotel_name?.trim();
                        const hId = u.hotel_id?.trim() || u.hotel_code?.trim() || name;
                        if (name && hId && !map.has(hId)) {
                            map.set(hId, {
                                id: hId,
                                name: name,
                                code: u.hotel_code?.trim() || 'SBI',
                                location: 'Assigned Property',
                                brandClass: 'Swiss-Belhotel',
                                region: 'Indonesia',
                                country: 'Indonesia',
                                stars: 4
                            });
                        }
                    });
                    rawData = Array.from(map.values());
                }
            } catch (fallbackErr) {
                console.warn("audit_users fallback query failed:", fallbackErr);
            }
        }

        // 3. Map items to standard Hotel format
        const mapped: Hotel[] = rawData.map((item: any) => {
            const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
            const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
            const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();

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
                } else {
                    region = 'Indonesia';
                }
            }

            return {
                id: finalId,
                name: item.name || item.hotel_name || '',
                location: item.location || item.city_country || 'Assigned Property',
                code: item.code || 'SBI',
                brandClass: item.brandClass || item.brand_class || item.brand || 'Swiss-Belhotel',
                region: region,
                country: country,
                stars: item.stars ? Number(item.stars) : 4
            };
        });

        // 4. Ensure DEFAULT_HOTELS are included
        DEFAULT_HOTELS.forEach(dh => {
            if (!mapped.some(h => h.id === dh.id || h.name.toLowerCase() === dh.name.toLowerCase())) {
                mapped.push(dh);
            }
        });

        if (!mapped.some(h => h.id === 'sbi-ho')) {
            mapped.unshift({
                id: 'sbi-ho',
                name: 'Swiss-Belhotel International',
                location: 'Corporate Headquarters',
                code: 'HQ',
                brandClass: 'Corporate',
                region: 'Asia Pacific'
            });
        }

        return [...mapped, ...HARDCODED_TEST_HOTELS];
    });
}
