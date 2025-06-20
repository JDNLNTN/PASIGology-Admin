import { useState, useEffect } from 'react';

export function useEmailConfirmedStatus(admins, apiUrl) {
  const [emailConfirmedMap, setEmailConfirmedMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!admins || admins.length === 0) return;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const ids = admins.map(a => a.id);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        const data = await response.json();
        setEmailConfirmedMap(data);
      } catch (err) {
        setEmailConfirmedMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [admins, apiUrl]);

  return { emailConfirmedMap, loading };
} 