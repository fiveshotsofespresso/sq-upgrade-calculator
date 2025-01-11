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

const VERSIONS: string[] = "6.7,6.7.1,6.7.2,6.7.3,6.7.4,6.7.5,6.7.6,6.7.7,7.0,7.1,7.2,7.2.1,7.3,7.4,7.5,7.6,7.7,7.8,7.9,7.9.1,7.9.2,7.9.3,7.9.4,7.9.5,7.9.6,8.0,8.1,8.2,8.3,8.3.1,8.4,8.4.1,8.4.2,8.5,8.5.1,8.6,8.6.1,8.7,8.7.1,8.8,8.9,8.9.1,8.9.2,8.9.3,8.9.4,8.9.5,8.9.6,8.9.7,8.9.8,8.9.9,8.9.10,9.0,9.0.1,9.1,9.2,9.2.1,9.2.2,9.2.3,9.2.4,9.3,9.4,9.5,9.6,9.6.1,9.7,9.7.1,9.8,9.9,9.9.1,9.9.2,9.9.3,9.9.4,9.9.5,9.9.6,9.9.7,9.9.8,10.0,10.1,10.2,10.2.1,10.3,10.4,10.4.1,10.5,10.5.1,10.6,10.7,10.8,10.8.1".split(',');

const COMMUNITY_BUILD_VERSIONS: string[] = "24.12,25.1".split(',');

const LTA_VERSIONS: LTAVersions = {
  "6.7": true,
  "7.9": true,
  "8.9": true,
  "9.9": true
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
    .filter(v => v.startsWith(majorMinor))
    .sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (aParts[i] === undefined) return -1;
        if (bParts[i] === undefined) return 1;
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
      }
      return 0;
    })
    .pop() || majorMinor;
};

const isAfterLastLTA = (version: string): boolean => {
  const [major, minor] = version.split('.').map(Number);
  const lastLTA = Object.keys(LTA_VERSIONS)
    .sort((a, b) => {
      const [aMajor, aMinor] = a.split('.').map(Number);
      const [bMajor, bMinor] = b.split('.').map(Number);
      return bMajor - aMajor || bMinor - aMinor;
    })[0];
  const [ltaMajor, ltaMinor] = lastLTA.split('.').map(Number);
  
  return major > ltaMajor || (major === ltaMajor && minor > ltaMinor);
};

const isValidVersion = (version: string, isCommunityBuild = false): boolean => {
  const normalizedVersion = normalizeVersion(version);
  const baseVersion = normalizedVersion.split('.').slice(0, 2).join('.');
  
  if (isCommunityBuild) {
    return COMMUNITY_BUILD_VERSIONS.includes(version);
  }
  
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
  
  const [major, minor] = startVersion.split('.').map(Number);
  
  if (edition.toLowerCase() === "community") {
    if (!isCommunityBuild) {
      Object.keys(LTA_VERSIONS)
        .filter(lta => {
          const [ltaMajor, ltaMinor] = lta.split('.').map(Number);
          const isAfter = ltaMajor > major || (ltaMajor === major && ltaMinor > minor);
          return isAfter && ltaMajor <= 9;
        })
        .sort((a, b) => {
          const [aMajor, aMinor] = a.split('.').map(Number);
          const [bMajor, bMinor] = b.split('.').map(Number);
          return aMajor - bMajor || aMinor - bMinor;
        })
        .forEach(lta => {
          path.push(getLatestPatchVersion(lta));
        });
      
      messages.push("Note: After 10.7, Community Edition has been renamed to Community Build with a new versioning scheme.");
      
      path.push(getLatestVersion(true));
    } else {
      if (startVersion !== getLatestVersion(true)) {
        path.push(getLatestVersion(true));
      }
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
      .filter(lta => {
        const [ltaMajor, ltaMinor] = lta.split('.').map(Number);
        return ltaMajor > major || (ltaMajor === major && ltaMinor > minor);
      })
      .sort((a, b) => {
        const [aMajor, aMinor] = a.split('.').map(Number);
        const [bMajor, bMinor] = b.split('.').map(Number);
        return aMajor - bMajor || aMinor - bMinor;
      })
      .forEach(lta => {
        path.push(getLatestPatchVersion(lta));
      });
    
    path.push(getLatestVersion());
  }
  
  return { path, messages };
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

    const result = findUpgradePath(version, edition);
    if (!result) {
      setError('Invalid version. Please enter a valid SonarQube version.');
      return;
    }

    setPath(result.path);
    setMessages(result.messages);
  };

  const isLTA = (version: string): boolean => {
    const [major, minor] = version.split('.').slice(0, 2);
    return LTA_VERSIONS[`${major}.${minor}`] || false;
  };

  return (
    <div className="w-full max-w-4xl p-6 space-y-6">
      <div className="space-y-4">
        <p className="text-lg">
          Figuring out your upgrade path with SonarQube can be tricky. Here's a tool that lets you select a version and understand what versions you need to upgrade through in order to arrive at a supported version.
        </p>
        
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p><strong>Key things to know:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>LTA (Long Term Support) versions are special releases that you must upgrade through. You cannot skip over an LTA version when upgrading.</li>
                <li>Community Edition has been renamed to Community Build starting after version 10.7, with a new versioning scheme (24.12 and later).</li>
                <li>For non-Community editions, if you're on a version after the last LTA (9.9), you can upgrade directly to the latest version.</li>
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
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            {messages.map((message, index) => (
              <p key={index} className="text-yellow-800">{message}</p>
            ))}
          </div>
        )}

        {path && (
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex flex-wrap gap-2 items-center">
              {path.map((ver, index) => (
                <React.Fragment key={ver}>
                  <div className={`px-4 py-2 rounded ${
                    index === path.length - 1 && !isLTA(ver)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ver}
                    {isLTA(ver) && (
                      <span className="ml-1 text-xs">(LTA)</span>
                    )}
                    {index === path.length - 1 && !isLTA(ver) && edition !== "community" && !isAfterLastLTA(path[0]) && (
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
    </div>
  );
};

export default UpgradePathCalculator;