import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw, X, ExternalLink, MonitorDown } from 'lucide-react';
import './ReleaseCenter.css';

const CLIENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';

const FALLBACK = {
  websiteVersion: '2.1.0',
  apiVersion: '2.1.0',
  windowsPackageVersion: '2.1.0.0',
  androidApkVersion: '2.1.0',
  releaseChannel: 'stable',
  notes: [],
  updatePolicy: {}
};

function compareVersions(left, right) {
  const parse = value => String(value || '').replace(/^v/, '').split(/[.+-]/).slice(0, 3).map(part => Number.parseInt(part, 10) || 0);
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

export default function ReleaseCenter() {
  const [open, setOpen] = useState(false);
  const [release, setRelease] = useState(FALLBACK);
  const [runtime, setRuntime] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [error, setError] = useState('');

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const [releaseResponse, versionResponse] = await Promise.all([
        fetch('/release-info.json', { cache: 'no-store' }),
        fetch('/api/version', { cache: 'no-store' }).catch(() => null)
      ]);
      if (!releaseResponse.ok) throw new Error('Release information is temporarily unavailable.');
      const releaseData = await releaseResponse.json();
      let runtimeData = null;
      if (versionResponse?.ok) runtimeData = await versionResponse.json();
      setRelease({ ...FALLBACK, ...releaseData });
      setRuntime(runtimeData);
      setCheckedAt(new Date());
    } catch (err) {
      setError(err.message || 'Could not check release status.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkForUpdates(); }, [checkForUpdates]);

  const currentWebsiteVersion = CLIENT_VERSION;
  const updateAvailable = useMemo(
    () => currentWebsiteVersion !== 'unknown' && release.websiteVersion !== 'unknown'
      && compareVersions(release.websiteVersion, currentWebsiteVersion) > 0,
    [currentWebsiteVersion, release.websiteVersion]
  );

  return (
    <div className="release-center">
      <button type="button" className="release-center-trigger" onClick={() => { setOpen(value => !value); if (!checkedAt) void checkForUpdates(); }} aria-expanded={open}>
        <Bell size={14} />
        <span>Release center · v{currentWebsiteVersion}</span>
        <span className={updateAvailable ? 'release-dot update' : 'release-dot'} />
      </button>
      {open && <section className="release-panel" aria-label="InsightBoard VDB release status">
        <header className="release-panel-head">
          <div><strong>InsightBoard VDB releases</strong><small>Synchronized Web, Windows Store &amp; Android APK status</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close release center"><X size={16}/></button>
        </header>
        <div className="release-version-grid">
          <div><span>Website</span><strong>v{currentWebsiteVersion}</strong><small>{updateAvailable ? 'New version available' : 'Current runtime'}</small></div>
          <div><span>API</span><strong>v{runtime?.apiVersion || runtime?.version || release.apiVersion}</strong><small>{runtime?.commit ? `Build ${runtime.commit.slice(0, 7)}` : 'Synchronized backend'}</small></div>
          <div><span>Windows Store &amp; APK</span><strong>{release.windowsPackageVersion} · APK v{release.androidApkVersion || release.websiteVersion}</strong><small>CI/CD auto-published</small></div>
        </div>
        {updateAvailable && <div className="release-update-callout">
          <strong>A website update is available.</strong>
          <span>Reload to load the latest deployed frontend. Save your work first.</span>
          <button type="button" onClick={() => window.location.reload()}>Reload InsightBoard VDB</button>
        </div>}
        <div className="release-notes">
          <strong>Latest release notes (v{release.websiteVersion})</strong>
          {release.notes?.length ? <ul>{release.notes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p>No release notes published yet.</p>}
        </div>
        <div className="release-policy">
          <div><CheckCircle2 size={15}/><span>Website, API, Windows Store PWA, and Android APK versions are synchronized via GitHub Actions.</span></div>
          <div><MonitorDown size={15}/><span>Manifest or Windows package changes automatically trigger Microsoft Store &amp; APK release workflows.</span></div>
        </div>
        {error && <p className="release-error" role="status">{error}</p>}
        <footer className="release-panel-foot">
          <small>{checkedAt ? `Checked ${checkedAt.toLocaleTimeString()}` : 'Not checked yet'}</small>
          <button type="button" onClick={checkForUpdates} disabled={checking}><RefreshCw size={14} className={checking ? 'spinning' : ''}/>{checking ? 'Checking…' : 'Check again'}</button>
          <a href="https://apps.microsoft.com/detail/9N20PQ3BJRSG" target="_blank" rel="noreferrer">Store listing <ExternalLink size={12}/></a>
        </footer>
      </section>}
    </div>
  );
}
