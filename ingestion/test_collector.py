import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import URLError
from datetime import datetime, timedelta
from types import SimpleNamespace
import collector as c

class FakeCache:
    def __init__(self, body): self.body=body; self.urls=[]
    def fetch(self, url, *args, **kwargs):
        self.urls.append(url)
        return c.Fetch(self.body, {"accessedAt":c.now(), "lastAttemptAt":c.now(), "resolvedUrl":url, "fromCache":False})

class FakeResponse(io.BytesIO):
    status=200
    url='https://example.com/source'
    headers={"Content-Type":"application/json"}

class CollectorTest(unittest.TestCase):
    def test_resolution_is_not_a_config_allowlist(self):
        cache=FakeCache(b'SYMBOL,NAME OF COMPANY, ISIN NUMBER\nCOLDCO,Cold Company Limited,INE123\n')
        with patch.object(c,'read_json',side_effect=AssertionError('must not consult config')):
            company,parser,response=c.resolve_company(cache,'coldco.NS',discover=False)
        self.assertEqual(company['symbol'],'COLDCO')
        self.assertEqual(company['name'],'Cold Company Limited')
        self.assertIsNone(parser)
        self.assertTrue(company['identity']['exchangeLinkVerified'])
        with self.assertRaises(c.AcquisitionError): c.resolve_company(cache,'ABSENT',discover=False)

    def test_no_attachment_filings_and_duplicate_attachments(self):
        dt=datetime.now(c.IST)-timedelta(hours=1)
        stamp=dt.strftime('%d-%b-%Y %H:%M:%S')
        base={"symbol":"COLDCO","an_dt":stamp,"desc":"Company update","attchmntText":"Details"}
        data=[dict(base,seq_id=1),dict(base,seq_id=2),dict(base,seq_id=3,attchmntFile='https://nsearchives.nseindia.com/a.pdf'),dict(base,seq_id=4,attchmntFile='https://nsearchives.nseindia.com/a.pdf')]
        data.append(dict(base,symbol='OTHER',seq_id=5))
        data.append(dict(base,an_dt=(dt-timedelta(days=40)).strftime('%d-%b-%Y %H:%M:%S'),seq_id=6))
        cache=FakeCache(json.dumps(data).encode())
        filings,state=c.announcements(cache,'COLDCO')
        self.assertEqual(len(filings),3)
        self.assertEqual(len({f['id'] for f in filings}),3)
        self.assertIn('from_date=',cache.urls[0])
        self.assertIn('to_date=',cache.urls[0])
        self.assertEqual(state['receivedRows'],6)
        self.assertEqual(state['retainedRows'],3)

    def test_failed_force_refresh_preserves_last_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache=c.Cache(Path(tmp))
            with patch.object(c,'urlopen',return_value=FakeResponse(b'{"price":12}')):
                first=cache.fetch('https://example.com/source',600)
            with patch.object(c,'urlopen',side_effect=URLError('simulated offline')):
                retained=cache.fetch('https://example.com/source',600,force=True)
            self.assertEqual(first.body,retained.body)
            self.assertEqual(first.provenance['accessedAt'],retained.provenance['accessedAt'])
            self.assertTrue(retained.provenance['stale'])
            self.assertIn('simulated offline',retained.provenance['refreshError'])
            state=c.source_state('COLDCO','prices',retained.provenance)
            self.assertEqual(state['status'],'stale')
            self.assertIsNotNone(state['error'])
            with cache.connect() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM responses').fetchone()[0],1)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM attempts').fetchone()[0],2)

    def test_cached_reuse_and_checksum(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache=c.Cache(Path(tmp))
            with patch.object(c,'urlopen',return_value=FakeResponse(b'original')):
                first=cache.fetch('https://example.com/source',600)
            with patch.object(c,'urlopen',side_effect=AssertionError('cache hit must not fetch')):
                second=cache.fetch('https://example.com/source',600)
                self.assertTrue(second.provenance['fromCache'])
            Path(first.provenance['rawFile']).write_bytes(b'changed')
            with self.assertRaises(c.AcquisitionError): cache.fetch('https://example.com/source',600)

    def test_reporting_period_is_read_from_text(self):
        period=c.fiscal_period(['Q2 FY27 Earnings Conference Call'],'earnings_call_transcript')
        self.assertEqual(period['end'],'2026-09-30')
        self.assertEqual(period['start'],'2026-07-01')
        unknown=c.fiscal_period(['unidentified document'],'annual_report')
        self.assertFalse(unknown['verified'])
        self.assertIsNone(unknown['end'])

    def test_bad_symbol_is_rejected(self):
        for symbol in ['https://evil.example/','../INFY','X?foo','']:
            with self.assertRaises(c.AcquisitionError): c.normal_symbol(symbol)

    def test_routine_publication_not_results(self):
        self.assertEqual(c.classify_filing('Newspaper Publication','financial results')[0],'routine')
        notice=c.classify_filing('Board Meeting Intimation','meeting scheduled to consider financial results')[0]
        self.assertEqual(notice,'watch')
        self.assertEqual(c.classify_filing('Outcome of Board Meeting','The board approved the unaudited financial results for the quarter ended 30 September 2026')[0],'review')
        self.assertNotEqual(c.classify_filing('Press Release','The company discusses its financial results')[0],'review')

if __name__=='__main__': unittest.main()
