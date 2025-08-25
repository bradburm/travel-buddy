import 'dotenv/config';

const API_BASE = 'https://api.aviationstack.com/v1';
const API_KEY = process.env.AVIATIONSTACK_API_KEY;

if (!API_KEY) {
    console.error('Cannot find AVIATIONSTACK_API_KEY')
    process.exit(1);
}

type Flight = {
    flight?: { iata?: string; number?: string };
    airline?: { name?: string; iata?: string };
    departure?: {
        airport?: string; iata?: string; scheduled?: string; estimated?: string;
        terminal?: string; gate?: string; delay?: number;
    };
    arrival?: {
        airport?: string; iata?: string; scheduled?: string; estimated?: string;
        terminal?: string; gate?: string; delay?: number;
    };
    aircraft?: { registration?: string; iata?: string; icao?: string };
    status?: string;
};

type Airport = {
    airport_name?: string;
    iata_code?: string;
};

async function fetchFlights(params: Record<string, string>) {
    const qs = new URLSearchParams({ access_key: API_KEY, limit: "5", offset: "0", ...params });
    const url = `${API_BASE}/flights?${qs.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Aviationstack flights endpoint error ${res.status}: ${text}`);
    }
    return (await res.json()) as { data?: Flight[]; pagination?: unknown; error?: unknown; };
}

async function fetchAirport(params: Record<string, string>) {
    const qs = new URLSearchParams({ access_key: API_KEY, limit: "5", offset: "0", ...params });
    const url = `${API_BASE}/airports?${qs.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Aviationstack airports endpoint error ${res.status}: ${text}`);
    }
    return (await res.json()) as { data?: Airport[]; pagination?: unknown; error?: unknown; };

}

// CLI (for now) usage:
//   node dist/index.js flight BA283
//   node dist/index.js arrivals LHR
const [, , cmd, arg] = process.argv;

(async () => {
    try {
        if (cmd === 'flight' && arg) {
            const out = await fetchFlights({ flight_iata: arg });
            const flights = out.data ?? [];
            if (flights.length === 0) { console.log('No results.'); return; }

            for (const f of flights) {
                const fl = f.flight?.iata ?? f.flight?.number ?? 'N/A';
                const al = f.airline?.name ?? f.airline?.iata ?? 'Unknown Airline';
                const dep = f.departure, arr = f.arrival;

                console.log('—'.repeat(60));
                console.log(`${fl} • ${al} • status: ${f.status ?? 'unknown'}`);
                console.log(`From: ${dep?.airport ?? dep?.iata ?? 'N/A'}  `
                    + `sched: ${dep?.scheduled ?? '—'}  est: ${dep?.estimated ?? '—'}  `
                    + `T${dep?.terminal ?? '—'} G${dep?.gate ?? '—'}  delay: ${dep?.delay ?? 0}m`);
                console.log(`To:   ${arr?.airport ?? arr?.iata ?? 'N/A'}  `
                    + `sched: ${arr?.scheduled ?? '—'}  est: ${arr?.estimated ?? '—'}  `
                    + `T${arr?.terminal ?? '—'} G${arr?.gate ?? '—'}  delay: ${arr?.delay ?? 0}m`);

                const ac = f.aircraft;
                if (ac?.registration || ac?.iata || ac?.icao) {
                    console.log(`Aircraft: reg ${ac?.registration ?? '—'} • type IATA ${ac?.iata ?? '—'} / ICAO ${ac?.icao ?? '—'}`);
                }
            }
            console.log('—'.repeat(60));
            return;
        }

        if (cmd === 'arrivals' && arg) {
            const out = await fetchFlights({ arr_iata: arg });
            const flights = out.data ?? [];
            if (flights.length === 0) { console.log('No results.'); return; }
            for (const f of flights) {
                const fl = f.flight?.iata ?? f.flight?.number ?? 'N/A';
                const al = f.airline?.name ?? f.airline?.iata ?? 'Unknown Airline';
                const dep = f.departure, arr = f.arrival;
                console.log('—'.repeat(60));
                console.log(`${fl} • ${al} • status: ${f.status ?? 'unknown'}`);
                console.log(`From: ${dep?.airport ?? dep?.iata ?? 'N/A'}  sched: ${dep?.scheduled ?? '—'}  est: ${dep?.estimated ?? '—'}  T${dep?.terminal ?? '—'} G${dep?.gate ?? '—'}  delay: ${dep?.delay ?? 0}m`);
                console.log(`To:   ${arr?.airport ?? arr?.iata ?? 'N/A'}  sched: ${arr?.scheduled ?? '—'}  est: ${arr?.estimated ?? '—'}  T${arr?.terminal ?? '—'} G${arr?.gate ?? '—'}  delay: ${arr?.delay ?? 0}m`);
            }
            console.log('—'.repeat(60));
            return;
        }

        if (cmd === 'departures' && arg) {
            const out = await fetchFlights({ dep_iata: arg });
            const flights = out.data ?? [];
            if (flights.length === 0) { console.log('No results.'); return; }
            for (const f of flights) {
                const fl = f.flight?.iata ?? f.flight?.number ?? 'N/A';
                const al = f.airline?.name ?? f.airline?.iata ?? 'Unknown Airline';
                const dep = f.departure, arr = f.arrival;
                console.log('—'.repeat(60));
                console.log(`${fl} • ${al} • status: ${f.status ?? 'unknown'}`);
                console.log(`From: ${dep?.airport ?? dep?.iata ?? 'N/A'}  sched: ${dep?.scheduled ?? '—'}  est: ${dep?.estimated ?? '—'}  T${dep?.terminal ?? '—'} G${dep?.gate ?? '—'}  delay: ${dep?.delay ?? 0}m`);
                console.log(`To:   ${arr?.airport ?? arr?.iata ?? 'N/A'}  sched: ${arr?.scheduled ?? '—'}  est: ${arr?.estimated ?? '—'}  T${arr?.terminal ?? '—'} G${arr?.gate ?? '—'}  delay: ${arr?.delay ?? 0}m`);
            }
            console.log('—'.repeat(60));
            return;
        }

        // NEW: airport lookup
        if (cmd === 'airport' && arg) {
            // Decide how to query: IATA (3), ICAO (4), or free-text search
            const params =
                /^[A-Za-z]{3}$/.test(arg) ? { iata_code: arg.toUpperCase() } :
                    /^[A-Za-z]{4}$/.test(arg) ? { icao_code: arg.toUpperCase() } :
                        { search: arg };

            const out = await fetchAirport(params);
            const airports = out.data ?? [];
            if (airports.length === 0) { console.log('No results.'); return; }

            for (const a of airports as any[]) {
                const name = a.airport_name ?? 'Unknown airport';
                const iata = a.iata_code ?? '—';
                const icao = a.icao_code ?? '—';
                const city = a.city ?? a.city_name ?? a.city_iata_code ?? '';
                const country = a.country_name ?? a.country_iso2 ?? '';
                const tz = a.timezone ?? a.timezone_gmt ?? '';
                const lat = a.latitude, lon = a.longitude;

                console.log('—'.repeat(60));
                console.log(`${name} (${iata}/${icao})`);
                if (city || country) console.log(`${city}${city && country ? ', ' : ''}${country}`);
                if (tz) console.log(`TZ: ${tz}`);
                if (lat != null && lon != null) console.log(`Coords: ${lat}, ${lon}`);
            }
            console.log('—'.repeat(60));
            return;
        }

        console.log(
            'Usage:\n' +
            '  flight <IATA>\n' +
            '  arrivals <AIRPORT_IATA>\n' +
            '  departures <AIRPORT_IATA>\n' +
            '  airport <IATA|ICAO|search text>'
        );
    } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
    }
})();
