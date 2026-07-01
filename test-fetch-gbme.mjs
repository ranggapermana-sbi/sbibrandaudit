import https from 'https';

const url = 'https://kjqnkrmmbintlhalubrf.supabase.co/rest/v1/hotels?code=eq.GBME';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqcW5rcm1tYmludGxoYWx1YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDc2MTAsImV4cCI6MjA4NTU4MzYxMH0.oSMFcsvmx-VLvH3o9iX0Sn1XbZblcFbicOHzs-kTtdc';

const options = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
