import https from 'https';

const url = 'https://gvnwxrejgdkixbszhxkw.supabase.co/rest/v1/audit_submissions?select=id,hotel_id,item_id,score,is_na,value,updated_at&limit=50';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnd4cmVqZ2RraXhic3poeGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTE2ODcsImV4cCI6MjA5NDcyNzY4N30.Pvv9rgR_Vr9McwxLrYfELeSpWYLNH2NPw0nkeGD6ZXo';

const options = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const arr = JSON.parse(data);
      console.log("Total rows fetched:", arr.length);
      const scored = arr.filter(row => row.score !== null && row.score !== undefined);
      console.log("Scored rows count:", scored.length);
      if (scored.length > 0) {
        console.log("First 5 scored rows:", scored.slice(0, 5));
      } else {
        console.log("No scored rows found in the fetched sample");
      }
    } catch(e) {
      console.log("Parse error:", e, data);
    }
  });
});
