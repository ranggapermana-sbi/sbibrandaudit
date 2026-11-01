// Hotels rated 1 star are excluded from auditor hotel selection, progress calculations and reports.
// The hotel record itself is kept, so an admin can still find it and change its rating back.
export const EXCLUDED_STAR_RATING = 1;

export const isExcludedHotel = (hotel: unknown): boolean =>
    !!hotel && Number((hotel as { stars?: unknown }).stars) === EXCLUDED_STAR_RATING;

export const withoutExcludedHotels = <T>(hotels: T[]): T[] =>
    hotels.filter(hotel => !isExcludedHotel(hotel));
