async function test() {
  try {
    const res = await fetch("https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112");
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
