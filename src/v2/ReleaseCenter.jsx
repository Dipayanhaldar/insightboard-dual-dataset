import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw, X, ExternalLink, MonitorDown } from 'lucide-react';
import './ReleaseCenter.css';

const FALLBACK = {
  websiteVersion: 'unknown',
  apiVersion: 'unknown',
  windowsPackageVersion: 'not generated',
  releaseChannel: 'unknown',
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

  const currentWebsiteVersion = runtime?.version || release.websiteVersion;
  const updateAvailable = useMemo(
    () => currentWebsiteVersion !== 'unknown' && release.websiteVersion !== 'unknown'
      && compareVersions(release.websiteVersion, currentWebsiteVersion) > 0,
    [currentWebsiteVersion, release.websiteVersion]
  );

  return (
    <div className="release-center">
      <button type="button" className="release-center-trigger" onClick={() => { setOpen(value => !value); if (!checkedAt) void checkForUpdates(); }} aria-expanded={open}>
        <Bell size={14} />
        <span>Release center</span>
        <span className={updateAvailable ? 'release-dot update' : 'release-dot'} />
      </button>
      {open && <section className="release-panel" aria-label="InsightBoard release status">
        <header className="release-panel-head">
          <div><strong>InsightBoard releases</strong><small>Version and update status</small></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close release center"><X size={16}/></button>
        </header>
        <div className="release-version-grid">
          <div><span>Website</span><strong>{currentWebsiteVersion}</strong><small>{updateAvailable ? 'New version available' : 'Current runtime'}</small></div>
          <div><span>API</span><strong>{runtime?.version || release.apiVersion}</strong><small>{runtime?.commit ? `Build ${runtime.commit.slice(0, 7)}` : 'Build identifier unavailable'}</small></div>
          <div><span>Windows Store package</span><strong>{release.windowsPackageVersion}</strong><small>Package version tracked separately</small></div>
        </div>
        {updateAvailable && <div className="release-update-callout">
          <strong>A website update is available.</strong>
          <span>Reload to load the latest deployed frontend. Save your work first.</span>
          <button type="button" onClick={() => window.location.reload()}>Reload InsightBoard</button>
        </div>}
        <div className="release-notes">
          <strong>Latest release notes</strong>
          {release.notes?.length ? <ul>{release.notes.map((note, index) => <li key={index}>{note}</li>)}</ul> : <p>No release notes published yet.</p>}
        </div>
        <div className="release-policy">
          <div><CheckCircle2 size={15}/><span>Website and API releases normally arrive without a Store package update.</span></div>
          <div><MonitorDown size={15}/><span>Manifest or Windows package identity changes require a new Store package submission.</span></div>
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
