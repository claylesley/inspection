// Platform abstraction — routes to Electron IPC or Capacitor based on runtime.
// Browser (dev) falls through to no-ops / downloads.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isElectron  = !!window.electronAPI?.isElectron;
export const isAndroid   = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const isCapacitor = Capacitor.isNativePlatform();

// ── Save inspection PDF + photos ────────────────────────────────────────────

export async function savePDF(base64, filename, photos = []) {
  if (isElectron) {
    return window.electronAPI.savePDF(base64, filename, photos);
  }

  if (isCapacitor) {
    try {
      // Write PDF to Documents directory
      await Filesystem.writeFile({
        path: `Inspections/${filename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      // Write each photo into a subfolder
      if (photos.length > 0) {
        const photoDir = `Inspections/${filename.replace('.pdf', '_Photos')}`;
        for (const { name, data } of photos) {
          const raw = data.includes(',') ? data.split(',')[1] : data;
          await Filesystem.writeFile({
            path: `${photoDir}/${name}`,
            data: raw,
            directory: Directory.Documents,
            recursive: true,
          });
        }
      }

      // Get the URI so we can share/open it
      const { uri } = await Filesystem.getUri({
        path: `Inspections/${filename}`,
        directory: Directory.Documents,
      });

      await Share.share({
        title: filename,
        url: uri,
        dialogTitle: 'Save or share inspection PDF',
      });

      return { success: true };
    } catch (err) {
      console.error('Capacitor savePDF error:', err);
      return { success: false, error: err.message };
    }
  }

  // Plain browser — trigger download
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  link.click();
  return { success: true };
}

// ── App-close sign-out hook (Electron only) ─────────────────────────────────

export function onAppClosing(callback) {
  if (isElectron && window.electronAPI?.onAppClosing) {
    window.electronAPI.onAppClosing(callback);
  }
  // On Android the OS handles app lifecycle — no equivalent needed
}

export function signOutComplete() {
  if (isElectron && window.electronAPI?.signOutComplete) {
    window.electronAPI.signOutComplete();
  }
}

// ── Device identity (Electron only) ────────────────────────────────────────

export async function getMacAddress() {
  if (isElectron && window.electronAPI?.getMacAddress) {
    return window.electronAPI.getMacAddress();
  }
  return null;
}

export async function getDeviceName() {
  if (isElectron && window.electronAPI?.getDeviceName) {
    return window.electronAPI.getDeviceName();
  }
  return null;
}

// ── App zoom ────────────────────────────────────────────────────────────────

export function applyZoom(factor) {
  if (isElectron && window.electronAPI?.setZoom) {
    window.electronAPI.setZoom(factor);
  } else {
    // Fallback for web/Capacitor: CSS zoom on the root element
    document.documentElement.style.zoom = factor;
  }
}

// ── Torch (Electron only for now) ───────────────────────────────────────────

export async function torchSet(enabled) {
  if (isElectron && window.electronAPI?.torchSet) {
    return window.electronAPI.torchSet(enabled);
  }
  return { ok: false, msg: 'Not supported on this platform' };
}
