// Hotels excluded from the brand audit are kept in the master hotel list, but are not counted:
// they are left out of auditor hotel selection, audit progress, inspection, assignments, results and every report.
// Excluded when rated 1 star, or when the hotel code is in EXCLUDED_HOTEL_CODES.
export const EXCLUDED_STAR_RATING = 1;

// Hotels not taking part in this brand audit, by hotel code (compared case-insensitively).
export const EXCLUDED_HOTEL_CODES: ReadonlySet<string> = new Set([
    'SBI',      // Swiss-Belhotel International (not present in the hotels table)
    'SBIS',     // Swiss-Belhotel Semarang
    'HCS',      // Hotel Ciputra Semarang
    'SQNA',     // Swiss-Belhotel Napier
    'SEKB',     // Swiss-Belexpress K-Square, Batam
    'SE379',    // Swiss-Belexpress Rest Area KM 379
    'SE164',    // Swiss-Belexpress Rest Area KM. 164
    'SE166',    // Swiss-Belexpress Rest Area KM. 166
    'SE260',    // Swiss-Belexpress Rest Area KM. 260B
    'SVCP',     // Swiss-Belvillas Coronet Peak
    'SBSM',     // Swiss-Belhotel Sentra Manado
    'ATBB',     // Anagata Tanjung Benoa Bali
    'SIYO',     // Next Hotel Yogyakarta / Swiss-Belinn Yogyakarta
    'LTSB',     // Lanta Thip House by Swiss-Belhotel
    'HSSB',     // Hanoi Signature by Swiss-Belhotel
    'SSUH',     // Sima Hotel Sumba
    'SRAU',     // Ashva Swiss-Belresort Ubud
    'SBIM',     // Swiss-Belhotel Morocco
    'SBITEST',  // Swiss-Belhotel Test
    'GBSE',     // Grand Swiss-Belhotel Waterfront Seef
    'SBII',     // Swiss-Belhotel International Indonesia
]);

export const isExcludedHotelCode = (code: unknown): boolean =>
    EXCLUDED_HOTEL_CODES.has(String(code ?? '').trim().toUpperCase());

export const isExcludedHotel = (hotel: unknown): boolean => {
    if (!hotel) return false;
    const { stars, code } = hotel as { stars?: unknown; code?: unknown };
    return Number(stars) === EXCLUDED_STAR_RATING || isExcludedHotelCode(code);
};

export const withoutExcludedHotels = <T>(hotels: T[]): T[] =>
    hotels.filter(hotel => !isExcludedHotel(hotel));
