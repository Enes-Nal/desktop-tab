import { useEffect, useState } from 'react';

export function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000 * 15);
    // align to next minute for accuracy
    const t = setTimeout(() => { tick(); }, 60_000 - (Date.now() % 60_000));
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });

  return (
    <div className="px-3 py-1 text-right leading-tight text-xs hover:bg-foreground/10 rounded-sm cursor-default">
      <div>{time}</div>
      <div>{date}</div>
    </div>
  );
}
