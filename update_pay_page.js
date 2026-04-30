const fs = require('fs');
let content = fs.readFileSync('src/app/pay/[id]/page.tsx', 'utf8');
content = content.replace(
  /const TOKEN_LABELS[\s\S]*?export default function PaymentPage\(\{ params \}: PageProps\) \{/,
`const TOKEN_LABELS: Record<PaymentToken, { color: string }> = {
  SOL: { color: "text-[#14F195]" },
  USDC: { color: "text-[#2775CA]" },
  USDT: { color: "text-[#26A17B]" },
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.request) {
    throw new Error(data.error || "Invalid payment link.");
  }
  return data;
};

export default function PaymentPage({ params }: PageProps) {`
);

content = content.replace(
  /  const \[error, setError\] = useState<string \| null>\(null\);\r?\n  const \[txHash, setTxHash\] = useState<string \| null>\(null\);\r?\n  const \[isLoading, setIsLoading\] = useState\(true\);[\s\S]*?loadPaymentData\(\);\r?\n  \}, \[id\]\);/,
`  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: fetchedData, error: fetchError, isLoading } = useSWR<PaymentRecord>(
    id ? \`/api/payments/\${id}\` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (fetchedData) {
      setPaymentData(fetchedData);
      if (fetchedData.lifecycle?.signature && fetchedData.lifecycle.status === "payment_finalized") {
        setTxHash(fetchedData.lifecycle.signature);
        setStatus("success");
      }
    }
    if (fetchError) {
      setStatus("error");
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load payment request.");
    }
  }, [fetchedData, fetchError]);`
);

fs.writeFileSync('src/app/pay/[id]/page.tsx', content);
