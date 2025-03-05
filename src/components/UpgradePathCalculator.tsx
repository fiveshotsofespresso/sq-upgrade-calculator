/* eslint-disable */
"use client";

import React, { useState, ChangeEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

// Define types
type Edition = 'community' | 'developer' | 'enterprise' | 'datacenter';
type UpgradePath = {
  path: string[];
  messages: string[];
};
type LTAVersions = {
  [key: string]: boolean;
};

// Constants
const VERSIONS: string[] = "6.7,6.7.1,6.7.2,6.7.3,6.7.4,6.7.5,6.7.6,6.7.7,7.0,7.1,7.2,7.2.1,7.3,7.4,7.5,7.6,7.7,7.8,7.9,7.9.1,7.9.2,7.9.3,7.9.4,7.9.5,7.9.6,8.0,8.1,8.2,8.3,8.3.1,8.4,8.4.1,8.4.2,8.5,8.5.1,8.6,8.6.1,8.7,8.7.1,8.8,8.9,8.9.1,8.9.2,8.9.3,8.9.4,8.9.5,8.9.6,8.9.7,8.9.8,8.9.9,8.9.10,9.0,9.0.1,9.1,9.2,9.2.1,9.2.2,9.2.3,9.2.4,9.3,9.4,9.5,9.6,9.6.1,9.7,9.7.1,9.8,9.9,9.9.1,9.9.2,9.9.3,9.9.4,9.9.5,9.9.6,9.9.7,9.9.8,10.0,10.1,10.2,10.2.1,10.3,10.4,10.4.1,10.5,10.5.1,10.6,10.7,10.8,10.8.1,2025.1".split(',');

const COMMUNITY_BUILD_VERSIONS: string[] = "24.12,25.1,25.2,25.3".split(',');

const LTA_VERSIONS: LTAVersions = {
  "6.7": true,
  "7.9": true,
  "8.9": true,
  "9.9": true,
  "2025.1": true
};

// Helper functions
const compareVersions = (v1: string, v2: string): number => {
  const parseVersion = (v: string): number[] => {
    const parts = v.split('.').map(Number);
    if (parts[0] >= 2024) {
      return [parts[0] * 100 + (parts[1] || 0), parts[2] || 0];
    }
    return parts;
  };

  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a !== b) return a - b;
  }
  return 0;
};

const normalizeVersion = (version: string): string => {
  const parts = version.split('.');
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}.0`;
  }
  return version;
};

const getLatestPatchVersion = (majorMinor: string): string => {
  return VERSIONS
    .filter(v => {
      const [major, minor] = v.split('.');
      const [targetMajor, targetMinor] = majorMinor.split('.');
      return major === targetMajor && minor === targetMinor;
    })
    .sort((a, b) => compareVersions(a, b))
    .pop() ?? majorMinor;
};

const hasFutureLTAs = (version: string): boolean => {
  return Object.keys(LTA_VERSIONS)
    .some(lta => compareVersions(lta, version) > 0 && 
          VERSIONS.some(v => v.startsWith(lta)));
};

const isAfterLastLTA = (version: string): boolean => {
  const availableLTAs = Object.keys(LTA_VERSIONS)
    .filter(lta => VERSIONS.some(v => v.startsWith(lta)))
    .sort((a, b) => compareVersions(b, a));
  
  if (availableLTAs.length === 0) return false;
  
  const lastLTA = availableLTAs[0];
  return compareVersions(version, lastLTA) >= 0;
};

const isValidVersion = (version: string, isCommunityBuild = false): boolean => {
  // First check if it's a year-based version (2024 or later)
  const [major] = version.split('.').map(Number);
  if (major >= 2024) {
    return VERSIONS.includes(version);
  }

  // For Community Build versions
  if (isCommunityBuild) {
    return COMMUNITY_BUILD_VERSIONS.includes(version);
  }
  
  // For traditional versions
  const normalizedVersion = normalizeVersion(version);
  const baseVersion = normalizedVersion.split('.').slice(0, 2).join('.');
  return VERSIONS.includes(normalizedVersion) || VERSIONS.includes(baseVersion);
};

const getLatestVersion = (isCommunityBuild = false): string => {
  if (isCommunityBuild) {
    return COMMUNITY_BUILD_VERSIONS[COMMUNITY_BUILD_VERSIONS.length - 1];
  }
  return VERSIONS[VERSIONS.length - 1];
};

const findUpgradePath = (startVersion: string, edition: Edition = "community"): UpgradePath | null => {
  const path: string[] = [];
  const messages: string[] = [];
  
  // Determine if this is a Community Build version
  const isCommunityBuild = Number(startVersion.split('.')[0]) >= 24;
  
  // Validate version
  if (!isValidVersion(startVersion, isCommunityBuild)) {
    return null;
  }
  
  // Add starting version
  path.push(startVersion);
  
  if (edition.toLowerCase() === "community") {
    if (!isCommunityBuild) {
      Object.keys(LTA_VERSIONS)
        .filter(lta => {
          return compareVersions(lta, startVersion) > 0 && compareVersions("10.0", lta) > 0;
        })
        .sort((a, b) => compareVersions(a, b))
        .forEach(lta => {
          path.push(getLatestPatchVersion(lta));
        });
      
      messages.push("Note: After 10.7, Community Edition has been renamed to Community Build with a new versioning scheme.");
      
      path.push(getLatestVersion(true));
    } else if (startVersion !== getLatestVersion(true)) {
        path.push(getLatestVersion(true));
      }
  } else {
    if (isAfterLastLTA(startVersion)) {
      const latestVersion = getLatestVersion();
      if (startVersion !== latestVersion) {
        path.push(latestVersion);
      }
      return { path, messages };
    }
    
    Object.keys(LTA_VERSIONS)
      .filter(lta => compareVersions(lta, startVersion) > 0)
      .sort((a, b) => compareVersions(a, b))
      .forEach(lta => {
        path.push(getLatestPatchVersion(lta));
      });
    
    path.push(getLatestVersion());
  }
 
  const finalPath = Array.from(new Set(path));
  
  return {path: finalPath, messages };
};

const UpgradePathCalculator: React.FC = () => {
  const [version, setVersion] = useState<string>('');
  const [edition, setEdition] = useState<Edition>('community');
  const [path, setPath] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const handleVersionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setVersion(e.target.value);
    setError('');
    setPath(null);
    setMessages([]);
  };

  const handleEditionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setEdition(e.target.value as Edition);
    setError('');
    setPath(null);
    setMessages([]);
  };

  const calculatePath = () => {
    if (!version) {
      setError('Please enter a version');
      return;
    }

    // Check if already at latest version
    const isLatestVersion = version === getLatestVersion(edition === "community");
    if (isLatestVersion) {
      setError('');
      setPath(null);
      setMessages(['You\'re already using the latest version of SonarQube!']);
      return;
    }

    const result = findUpgradePath(version, edition);
    if (!result) {
      setError('Invalid version. Please enter a valid SonarQube version.');
      return;
    }

    setPath(result.path);
    setMessages(result.messages);
  };

  return (
    <div className="w-full max-w-4xl p-6 space-y-6">
      <div className="space-y-4">
      <p className="text-lg">
        Figuring out your upgrade path with SonarQube can be tricky. Here's a tool that lets you select a version and understand what versions you need to upgrade through in order to arrive at an active version.
      </p>
      
      <Card className="bg-blue-50">
        <CardContent className="pt-6">
        <div className="space-y-2">
          <p><strong>Key things to know:</strong></p>
          <ul className="list-disc pl-6 space-y-2">
          <li>LTA (Long Term Active) versions are special releases that you must upgrade through. You cannot skip over an LTA version when upgrading.</li>
          <li>Community Edition has been renamed to Community Build starting after version 10.7, with a new versioning scheme (24.12 and later).</li>
          <li>Community Build has no LTA versions, and no intermediate upgrades are currently needed after 9.9 LTA</li>
          </ul>
        </div>
        </CardContent>
      </Card>
      </div>

      <div className="mb-8">
      <h1 className="text-2xl font-bold mb-6">Calculate Your Upgrade Path</h1>
      
      <div className="flex gap-4 mb-4">
        <select
        value={version}
        onChange={handleVersionChange}
        className="flex-grow p-2 border rounded"
        >
        <option value="">Select version...</option>
        {edition === "community" ? (
          <>
          <optgroup label="Community Edition">
            {VERSIONS
            .filter(ver => {
              const [major, minor] = ver.split('.').map(Number);
              return major < 10 || (major === 10 && minor <= 7);
            })
            .map(ver => (
              <option key={ver} value={ver}>
              {ver}
              </option>
            ))}
          </optgroup>
          <optgroup label="Community Build">
            {COMMUNITY_BUILD_VERSIONS.map(ver => (
            <option key={ver} value={ver}>
              {ver}
            </option>
            ))}
          </optgroup>
          </>
        ) : (
          VERSIONS.map(ver => (
          <option key={ver} value={ver}>
            {ver}
          </option>
          ))
        )}
        </select>
        <select
        value={edition}
        onChange={handleEditionChange}
        className="p-2 border rounded"
        >
        <option value="community">Community Build / Edition</option>
        <option value="developer">Developer Edition</option>
        <option value="enterprise">Enterprise Edition</option>
        <option value="datacenter">Data Center Edition</option>
        </select>
        <button
        onClick={calculatePath}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
        Calculate Path
        </button>
      </div>
      
      {error && (
        <div className="text-red-500 mb-4">
        {error}
        </div>
      )}

      {messages.length > 0 && (
        <div className={`${
        messages.length === 1 && messages[0].includes('latest version')
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
        } p-4 rounded-lg mb-4`}>
        {messages.map((message) => (
          <p key={`message-${message}`} className={
          messages.length === 1 && messages[0].includes('latest version')
            ? 'text-green-800'
            : 'text-yellow-800'
          }>{message}</p>
        ))}
        </div>
      )}

      {path && (
        <div className="bg-blue-50 p-6 rounded-lg">
        <div className="flex flex-wrap gap-2 items-center">
          {path.map((ver, index) => (
          <React.Fragment key={ver}>
            <div className={`px-4 py-2 rounded ${
            LTA_VERSIONS[ver.split('.').slice(0, 2).join('.')] 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
            }`}>
            {ver}
            {LTA_VERSIONS[ver.split('.').slice(0, 2).join('.')] && (
              <span className="ml-1 text-xs">(LTA)</span>
            )}
            {index === path.length - 1 && 
             !LTA_VERSIONS[ver.split('.').slice(0, 2).join('.')] && 
             edition !== "community" && 
             (isAfterLastLTA(path[0]) || isAfterLastLTA(path[path.length - 2] || path[0])) &&
             hasFutureLTAs(path[0]) && (
              <span className="ml-1 text-xs">(optional)</span>
            )}
            </div>
            {index < path.length - 1 && (
            <ChevronRight className="text-gray-400" size={20} />
            )}
          </React.Fragment>
          ))}
        </div>
        </div>
      )}
      </div>
      {path && !messages.some(msg => msg.includes('latest version')) && (
      <button 
        onClick={() => path && navigator.clipboard.writeText(path.join(" -> "))}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Copy Path
      </button>
      )}
    </div>
    
  );
};

export default UpgradePathCalculator;
