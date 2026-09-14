// scripts/file-cache.js
/**
 * File State Cache Engine (Inspired by Claude Code FileStateCache / readFileCache)
 * Eliminates redundant file reads across multi-turn sessions by tracking
 * path, mtime, size, and SHA-256 content hashes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileStateCache {
  constructor(options = {}) {
    this.cache = new Map(); // path -> { mtimeMs, size, sha256, lineCount, lastAccessed }
    this.hits = 0;
    this.misses = 0;
    this.maxEntries = options.maxEntries || 500;
  }

  /**
   * Computes SHA-256 hash of a file buffer or string.
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Normalizes absolute file path.
   */
  normalizePath(filePath) {
    return path.resolve(filePath).replace(/\\/g, '/');
  }

  /**
   * Checks or registers file in the state cache.
   * Returns: { isCached, isModified, sha256, size, mtimeMs, hit }
   */
  check(filePath) {
    const normPath = this.normalizePath(filePath);
    if (!fs.existsSync(normPath)) {
      return { exists: false, error: 'File not found' };
    }

    const stat = fs.statSync(normPath);
    if (!stat.isFile()) {
      return { exists: true, isFile: false, error: 'Not a regular file' };
    }

    const cached = this.cache.get(normPath);
    const now = Date.now();

    // Cache hit: exact mtime and size match
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      this.hits++;
      cached.lastAccessed = now;
      return {
        exists: true,
        isCached: true,
        isModified: false,
        hit: true,
        sha256: cached.sha256,
        size: cached.size,
        lineCount: cached.lineCount,
        mtimeMs: cached.mtimeMs
      };
    }

    // Cache miss or modified file
    this.misses++;
    const content = fs.readFileSync(normPath);
    const sha256 = this.hashContent(content);
    const lineCount = content.toString('utf-8').split('\n').length;

    const entry = {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      sha256,
      lineCount,
      lastAccessed: now
    };

    // Evict oldest if capacity exceeded
    if (this.cache.size >= this.maxEntries) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(normPath, entry);

    return {
      exists: true,
      isCached: !!cached,
      isModified: true,
      hit: false,
      sha256,
      size: stat.size,
      lineCount,
      mtimeMs: stat.mtimeMs
    };
  }

  /**
   * Invalidates a file or directory from the cache.
   */
  invalidate(filePath) {
    const normPath = this.normalizePath(filePath);
    return this.cache.delete(normPath);
  }

  /**
   * Clears the entire cache.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache diagnostic metrics.
   */
  getMetrics() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    return {
      totalEntries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate.toFixed(1)}%`
    };
  }
}

// Singleton global instance
const globalFileCache = new FileStateCache();

module.exports = {
  FileStateCache,
  globalFileCache
};
