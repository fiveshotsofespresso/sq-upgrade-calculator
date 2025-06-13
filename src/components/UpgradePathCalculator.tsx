/* eslint-disable */
"use client"; 

import React, { useState, ChangeEvent } from 'react';
import { ChevronRight, Layers, GitPullRequest } from 'lucide-react';
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
type UpgradeDirection = 'community-to-server' | 'server-to-community';
type UpgradeResult = {
  targetVersions: string[];
  messages: string[];
};
type CalculatorType = 'version-upgrade' | 'edition-migration';

// Constants for version upgrade calculator
const VERSIONS: string[] = "6.7,6.7.1,6.7.2,6.7.3,6.7.4,6.7.5,6.7.6,6.7.7,7.0,7.1,7.2,7.2.1,7.3,7.4,7.5,7.6,7.7,7.8,7.9,7.9.1,7.9.2,7.9.3,7.9.4,7.9.5,7.9.6,8.0,8.1,8.2,8.3,8.3.1,8.4,8.4.1,8.4.2,8.5,8.5.1,8.6,8.6.1,8.7,8.7.1,8.8,8.9,8.9.1,8.9.2,8.9.3,8.9.4,8.9.5,8.9.6,8.9.7,8.9.8,8.9.9,8.9.10,9.0,9.0.1,9.1,9.2,9.2.1,9.2.2,9.2.3,9.2.4,9.3,9.4,9.5,9.6,9.6.1,9.7,9.7.1,9.8,9.9,9.9.1,9.9.2,9.9.3,9.9.4,9.9.5,9.9.6,9.9.7,9.9.8,10.0,10.1,10.2,10.2.1,10.3,10.4,10.4.1,10.5,10.5.1,10.6,10.7,10.8,10.8.1,2025.1,2025.1.1,2025.1.2,2025.2,2025.3".split(',');

const COMMUNITY_BUILD_VERSIONS: string[] = "24.12,25.1,25.2,25.3,25.4,25.5,25.6".split(',');

// Object to track December releases for Community Build
const DECEMBER_RELEASES: {[key: string]: boolean} = {
  "24.12": true,
  // Add future December releases here
};

const LTA_VERSIONS: LTAVersions = {
  "6.7": true,
  "7.9": true,
  "8.9": true,
  "9.9": true,
  "2025.1": true
};

// Constants for migration calculator
const COMMUNITY_BUILD_VERSIONS_MIGRATION = [
  // Legacy Community versions that can upgrade to 2025.1
  "9.9", "9.9.1", "9.9.2", "9.9.3", "9.9.4", "9.9.5", "9.9.6", "9.9.7", "9.9.8",
  "10.0", "10.1", "10.2", "10.2.1", "10.3", "10.4", "10.4.1", "10.5", "10.5.1", 
  "10.6", "10.7", "10.8", "10.8.1",
  // New Community Build versions
  "24.12", "25.1", "25.2", "25.3", "25.4", "25.5", "25.6"
];

// Server versions
const SERVER_VERSIONS = [
  "2025.1", "2025.1.1", "2025.1.2", "2025.2", "2025.3"
];

// Define LTA Server versions (base versions only)
const LTA_SERVER_VERSIONS = ["2025.1"];

// Release dates mapping
const RELEASE_DATES: { [key: string]: Date } = {
  // Community Build release dates
  "24.12": new Date("2024-12-02"),
  "25.1": new Date("2025-01-07"),
  "25.2": new Date("2025-02-03"),
  "25.3": new Date("2025-03-04"),
  "25.4": new Date("2025-04-07"),
  "25.5": new Date("2025-05-09"),
  "25.6": new Date("2025-06-02"),
  
  // Server release dates
  "2025.1": new Date("2025-01-23"),
  "2025.1.1": new Date("2025-01-23"),
  "2025.1.2": new Date("2025-01-23"),
  "2025.2": new Date("2025-03-26"),
  "2025.3": new Date("2025-05-29")
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

  // For Community Build versions (24.x, 25.x, etc.)
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

// Get the latest December release version
const getLatestDecemberRelease = (): string | null => {
  return Object.keys(DECEMBER_RELEASES)
    .sort((a, b) => compareVersions(b, a))[0] || null;
};

// Check if version is before the December release of its year
const isBeforeDecemberRelease = (version: string): boolean => {
  if (!version.includes('.')) return false;
  
  const [year, month] = version.split('.').map(Number);
  return month < 12;
};

// Function to check if we need to add a December release to the upgrade path
const needsDecemberRelease = (startVersion: string, targetVersion: string): boolean => {
  // If already on a December release, no need to add it
  if (DECEMBER_RELEASES[startVersion]) return false;
  
  const [startYear] = startVersion.split('.').map(Number);
  const [targetYear] = targetVersion.split('.').map(Number);
  
  // If target is in a different year and start is before December release
  return targetYear > startYear && isBeforeDecemberRelease(startVersion);
};

// Check if version is an LTA patch
const isLTAPatch = (version: string): boolean => {
  const baseVersion = version.split('.').slice(0, 2).join('.');
  return LTA_VERSIONS[baseVersion] && version !== baseVersion;
};

// Get base LTA version
const getBaseLTAVersion = (version: string): string => {
  return version.split('.').slice(0, 2).join('.');
};

// VERSION UPGRADE CALCULATOR FUNCTIONS
const findUpgradePath = (startVersion: string, edition: Edition = "community"): UpgradePath | null => {
  const path: string[] = [];
  const messages: string[] = [];
  
  // Determine if this is a Community Build version
  const isCommunityBuild = Number(startVersion.split('.')[0]) >= 24 && Number(startVersion.split('.')[0]) < 2024;
  
  // Validate version
  if (!isValidVersion(startVersion, isCommunityBuild)) {
    return null;
  }
  
  // Add starting version
  path.push(startVersion);
  
  // Special handling for current LTA versions (2025.1 and 2025.1.1)
  const baseLTA = getBaseLTAVersion(startVersion);
  const latestLTA = "2025.1"; // The current/latest LTA
  
  if (baseLTA === latestLTA && LTA_VERSIONS[baseLTA] && startVersion.startsWith(baseLTA) && edition !== "community") {
    const latestLTAPatch = getLatestPatchVersion(baseLTA);
    const latestOverallVersion = getLatestVersion();
    
    if (startVersion === "2025.1" || startVersion === "2025.1.1") {
      // Show both the recommended LTA patch and optional latest version
      path.push(latestLTAPatch);
      path.push(latestOverallVersion);
      messages.push("Upgrading to the latest LTA patch (2025.1.2) is recommended for stability, but you can also upgrade directly to 2025.3 if you prefer newer features.");
      return { path, messages };
    }
  }
  
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
      
      // First add the earliest Community Build version (the transition point)
      const firstCommunityBuild = COMMUNITY_BUILD_VERSIONS[0];
      path.push(firstCommunityBuild);
      
      // If we're not already at the latest version, proceed with Community Build upgrade path
      if (firstCommunityBuild !== getLatestVersion(true)) {
        const latestVersion = getLatestVersion(true);
        
        // Check if we need to include December release
        if (needsDecemberRelease(firstCommunityBuild, latestVersion)) {
          const decemberRelease = getLatestDecemberRelease();
          if (decemberRelease && compareVersions(decemberRelease, firstCommunityBuild) > 0) {
            path.push(decemberRelease);
            messages.push("Note: Upgrading through the December release is required for Community Build.");
          }
        }
        
        // Finally add the latest version
        path.push(latestVersion);
      }
    } else {
      // Handle Community Build to Community Build upgrades
      const latestVersion = getLatestVersion(true);
      
      if (startVersion !== latestVersion) {
        // Check if we need to include December release
        if (needsDecemberRelease(startVersion, latestVersion)) {
          const decemberRelease = getLatestDecemberRelease();
          if (decemberRelease && compareVersions(decemberRelease, startVersion) > 0) {
            path.push(decemberRelease);
          }
        }
        
        // Add the latest version if it's not already added and different from December release
        if (path[path.length - 1] !== latestVersion) {
          path.push(latestVersion);
        }
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

// MIGRATION CALCULATOR FUNCTIONS
// Function to determine eligible server versions for upgrade from Community Build
const findEligibleServerVersions = (communityVersion: string): UpgradeResult => {
  const targetVersions: string[] = [];
  const messages: string[] = [];

  // Legacy Community Edition (9.9 through 10.8.x)
  if (communityVersion.startsWith("9.9") || communityVersion.startsWith("10.")) {
    // Must go through latest LTA patch first
    const latestLTAPatch = getLatestPatchVersion("2025.1");
    targetVersions.push(latestLTAPatch);
    
    messages.push(`Legacy Community Edition (9.9.x - 10.8.x) should migrate to the latest LTA patch (${latestLTAPatch}).`);
    messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");
    return { targetVersions, messages };
  }

  // For newer Community Build versions (24.12 and later)
  const communityReleaseDate = RELEASE_DATES[communityVersion];
  
  if (!communityReleaseDate) {
    messages.push("Unknown version or release date.");
    return { targetVersions, messages };
  }

  // Check if this Community Build was released before the current LTA (2025.1)
  const currentLTA = "2025.1";
  const currentLTADate = RELEASE_DATES[currentLTA];
  
  if (currentLTADate && communityReleaseDate < currentLTADate) {
    // Community Build released before current LTA should migrate to latest LTA patch
    const latestLTAPatch = getLatestPatchVersion(currentLTA);
    targetVersions.push(latestLTAPatch);
    messages.push(`Community Build ${communityVersion} (released before the current LTA) should migrate to the latest LTA patch (${latestLTAPatch}).`);
    messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");
    return { targetVersions, messages };
  }

  // Find all server versions released after this Community Build
  const eligibleServerVersions = SERVER_VERSIONS.filter(serverVersion => {
    const serverReleaseDate = RELEASE_DATES[serverVersion];
    return serverReleaseDate && serverReleaseDate > communityReleaseDate;
  }).sort((a, b) => compareVersions(a, b));

  if (eligibleServerVersions.length === 0) {
    messages.push("No compatible SonarQube Server version is available yet. Please wait for the next Server release.");
    return { targetVersions, messages };
  }

  // Get the latest eligible server version
  const latestEligibleServer = eligibleServerVersions[eligibleServerVersions.length - 1];
  
  // Check if it's an LTA - if so, use the latest patch
  const baseLTA = getBaseLTAVersion(latestEligibleServer);
  let targetServerVersion: string;
  
  if (LTA_SERVER_VERSIONS.includes(baseLTA)) {
    targetServerVersion = getLatestPatchVersion(baseLTA);
  } else {
    targetServerVersion = latestEligibleServer;
  }

  targetVersions.push(targetServerVersion);
  messages.push(`Community Build ${communityVersion} should migrate to Server ${targetServerVersion}.`);
  
  // Only show "use Version Upgrade Path calculator" if not already at latest
  const latestServerVersion = SERVER_VERSIONS[SERVER_VERSIONS.length - 1];
  if (targetServerVersion !== latestServerVersion) {
    messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");
  }

  return { targetVersions, messages };
};

// Function to determine eligible Community Build versions for migration from Server
const findEligibleCommunityVersions = (serverVersion: string): UpgradeResult => {
  const targetVersions: string[] = [];
  const messages: string[] = [];
  
  const serverReleaseDate = RELEASE_DATES[serverVersion];
  
  if (!serverReleaseDate) {
    messages.push("Unknown version or release date.");
    return { targetVersions, messages };
  }
  
  // Find the latest Community Build version released after this Server version
  let latestCompatible: string | null = null;
  
  COMMUNITY_BUILD_VERSIONS_MIGRATION
    .filter(ver => !ver.startsWith("9") && !ver.startsWith("10")) // Only consider new Community Build versions
    .forEach(communityVersion => {
      const communityReleaseDate = RELEASE_DATES[communityVersion];
      if (communityReleaseDate && communityReleaseDate > serverReleaseDate) {
        if (!latestCompatible || compareVersions(communityVersion, latestCompatible) > 0) {
          latestCompatible = communityVersion;
        }
      }
    });
  
  if (latestCompatible) {
    targetVersions.push(latestCompatible);
    messages.push(`Server ${serverVersion} can migrate to Community Build ${latestCompatible}.`);
    
    // Check if it's a December release that will be required for future upgrades
    if (DECEMBER_RELEASES[latestCompatible]) {
      messages.push("Note: This is a December release, which will be a required milestone for future Community Build upgrades.");
    }
    
    messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");
  } else {
    messages.push("No compatible Community Build version is available yet. Please wait for the next Community Build release.");
  }
  
  return { targetVersions, messages };
};

// MAIN COMPONENT
const UpgradePathCalculator: React.FC = () => {
  // Common state
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('version-upgrade');
  
  // Version upgrade calculator state
  const [version, setVersion] = useState<string>('');
  const [edition, setEdition] = useState<Edition>('community');
  const [path, setPath] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // Migration calculator state
  const [migrationVersion, setMigrationVersion] = useState<string>('');
  const [direction, setDirection] = useState<UpgradeDirection>('community-to-server');
  const [targetVersions, setTargetVersions] = useState<string[] | null>(null);
  const [migrationMessages, setMigrationMessages] = useState<string[]>([]);
  const [migrationError, setMigrationError] = useState<string>('');

  // Version upgrade calculator handlers
  const handleVersionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setVersion(e.target.value);
    setError('');
    setPath(null);
    setMessages([]);
  };

  const handleEditionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newEdition = e.target.value as Edition;
    setEdition(newEdition);
    setError('');
    setPath(null);
    setMessages([]);
    
    // Clear version if switching between Community and other editions
    // and current version is incompatible
    if (version) {
      const isCommunityBuild = Number(version.split('.')[0]) >= 24;
      if (newEdition === 'community' && Number(version.split('.')[0]) >= 2025) {
        setVersion('');
      } else if (newEdition !== 'community' && isCommunityBuild) {
        setVersion('');
      }
    }
  };

  const calculatePath = () => {
    if (!version) {
      setError('Please enter a version');
      return;
    }

    // Validate version compatibility with edition
    const isCommunityBuild = Number(version.split('.')[0]) >= 24 && Number(version.split('.')[0]) < 2024;
    if (edition === 'community' && Number(version.split('.')[0]) >= 2025) {
      setError('Server versions (2025.x) are not available for Community edition. Please select a different edition.');
      return;
    }
    if (edition !== 'community' && isCommunityBuild) {
      setError('Community Build versions are only available for Community edition. Please select Community edition.');
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

  // Migration calculator handlers
  const handleMigrationVersionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMigrationVersion(e.target.value);
    setMigrationError('');
    setTargetVersions(null);
    setMigrationMessages([]);
  };

  const handleDirectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDirection(e.target.value as UpgradeDirection);
    setMigrationVersion('');
    setMigrationError('');
    setTargetVersions(null);
    setMigrationMessages([]);
  };

  const calculateEligibleVersions = () => {
    if (!migrationVersion) {
      setMigrationError('Please select a version');
      return;
    }

    let result: UpgradeResult;
    
    if (direction === 'community-to-server') {
      result = findEligibleServerVersions(migrationVersion);
    } else {
      result = findEligibleCommunityVersions(migrationVersion);
    }
    
    setTargetVersions(result.targetVersions);
    setMigrationMessages(result.messages);
    
    if (result.targetVersions.length === 0) {
      setMigrationError('');
    }
  };

  const handleCalculatorTypeChange = (type: CalculatorType) => {
    setCalculatorType(type);
    
    // Reset all state when switching calculators
    setVersion('');
    setEdition('community');
    setPath(null);
    setMessages([]);
    setError('');

    setMigrationVersion('');
    setDirection('community-to-server');
    setTargetVersions(null);
    setMigrationMessages([]);
    setMigrationError('');
  };

  return (
    <div className="w-full max-w-4xl p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">SonarQube Calculator</h1>
        <p className="text-lg">
          Tools for planning your SonarQube upgrades and migrations.
        </p>
      </div>

      {/* Calculator Type Selector */}
      <div className="flex space-x-4 border-b pb-4">
        <button 
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            calculatorType === 'version-upgrade' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => handleCalculatorTypeChange('version-upgrade')}
        >
          <Layers size={20} />
          <span>Version Upgrade Path</span>
        </button>
        <button 
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            calculatorType === 'edition-migration' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => handleCalculatorTypeChange('edition-migration')}
        >
          <GitPullRequest size={20} />
          <span>Edition Migration</span>
        </button>
      </div>

      {/* Calculator Content */}
      <div className="space-y-6">
        {calculatorType === 'version-upgrade' ? (
          /* VERSION UPGRADE CALCULATOR */
          <>
            {/* Version Upgrade Info Card */}
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p><strong>Key things to know:</strong></p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>LTA (Long Term Active) versions are special releases that you must upgrade through. You cannot skip over an LTA version when upgrading.</li>
                    <li>Community Edition has been renamed to Community Build starting after version 10.7, with a new versioning scheme (24.12 and later).</li>
                    <li>December releases (like 24.12) are required milestones when upgrading Community Build. You cannot skip over a December release when upgrading Community Build.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <h2 className="text-2xl font-bold">Calculate Your Upgrade Path</h2>
            
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
                          return major < 10 || (major === 10 && minor <= 8);
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
                  : messages[0].includes('you can either')
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-yellow-50 border border-yellow-200'
              } p-4 rounded-lg mb-4`}>
                {messages.map((message, index) => (
                  <p key={`message-${message}`} className={`${
                    messages.length === 1 && messages[0].includes('latest version')
                      ? 'text-green-800'
                      : messages[0].includes('you can either')
                        ? 'text-blue-800'
                        : 'text-yellow-800'
                  } ${message.startsWith('•') ? 'ml-4' : ''}`}>{message}</p>
                ))}
              </div>
            )}

            {path && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex flex-wrap gap-2 items-center">
                  {path.map((ver, index) => {
                    const baseLTAVersion = getBaseLTAVersion(ver);
                    const isRecommendedLTAPatch = ver === "2025.1.2" && 
                      (path[0] === "2025.1" || path[0] === "2025.1.1");
                    
                    // Check if this is an optional upgrade after an LTA
                    let isOptional = false;
                    if (edition !== "community" && index === path.length - 1 && index > 0) {
                      // Check if the previous version in the path is an LTA
                      const prevVersion = path[index - 1];
                      const prevBaseLTA = getBaseLTAVersion(prevVersion);
                      if (LTA_VERSIONS[prevBaseLTA] && !LTA_VERSIONS[baseLTAVersion]) {
                        isOptional = true;
                      }
                    }
                    
                    return (
                      <React.Fragment key={ver}>
                        <div className={`px-4 py-2 rounded ${
                          LTA_VERSIONS[ver.split('.').slice(0, 2).join('.')] 
                            ? 'bg-yellow-100 text-yellow-800'
                            : DECEMBER_RELEASES[ver]
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ver}
                          {LTA_VERSIONS[ver.split('.').slice(0, 2).join('.')] && (
                            <span className="ml-1 text-xs">(LTA)</span>
                          )}
                          {DECEMBER_RELEASES[ver] && (
                            <span className="ml-1 text-xs">(December Release)</span>
                          )}
                          {isRecommendedLTAPatch && (
                            <span className="ml-1 text-xs">(recommended)</span>
                          )}
                          {isOptional && (
                            <span className="ml-1 text-xs">(optional)</span>
                          )}
                        </div>
                        {index < path.length - 1 && (
                          <ChevronRight className="text-gray-400" size={20} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
            
            {path && !messages.some(msg => msg.includes('latest version')) && (
              <button 
                onClick={() => path && navigator.clipboard.writeText(path.join(" -> "))}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Copy Path
              </button>
            )}
          </>
        ) : (
          /* EDITION MIGRATION CALCULATOR */
          <>
            {/* Migration Info Card */}
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p><strong>Important information:</strong></p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Legacy Community Edition (9.9.x - 10.8.x) must upgrade through the latest LTA patch (2025.1.2) before moving to later Server versions.</li>
                    <li>Legacy Community Edition users can also switch to the same version of a commercial edition and continue the upgrade path from there.</li>
                    <li>Newer Community Build versions (24.12 and later) can only upgrade to Server versions released <strong>after</strong> them.</li>
                    <li>When upgrading, you must always go through the latest LTA patch before upgrading to non-LTA versions.</li>
                    <li>SonarQube Server can only migrate to Community Build versions released <strong>after</strong> it.</li>
                    <li>If no compatible version exists, you'll need to wait for the next release.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold">Edition Migration Calculator</h2>
            
            <div className="flex gap-4 mb-4">
              <select
                value={direction}
                onChange={handleDirectionChange}
                className="p-2 border rounded"
              >
                <option value="community-to-server">Community Build to Server</option>
                <option value="server-to-community">Server to Community Build</option>
              </select>
            </div>
            
            <div className="flex gap-4 mb-4">
              <select
                value={migrationVersion}
                onChange={handleMigrationVersionChange}
                className="flex-grow p-2 border rounded"
              >
                {direction === 'community-to-server' ? (
                  <>
                    <option value="">Select Community Build version...</option>
                    <optgroup label="Legacy Community Edition">
                      {COMMUNITY_BUILD_VERSIONS_MIGRATION
                        .filter(ver => ver.startsWith("9") || ver.startsWith("10"))
                        .map(ver => (
                          <option key={ver} value={ver}>
                            {ver}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Community Build">
                      {COMMUNITY_BUILD_VERSIONS_MIGRATION
                        .filter(ver => !ver.startsWith("9") && !ver.startsWith("10"))
                        .map(ver => (
                          <option key={ver} value={ver}>
                            {ver}
                          </option>
                        ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <option value="">Select Server version...</option>
                    {SERVER_VERSIONS.map(ver => (
                      <option key={ver} value={ver}>
                        {ver} {LTA_SERVER_VERSIONS.includes(getBaseLTAVersion(ver)) && '(LTA)'}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <button
                onClick={calculateEligibleVersions}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Check Compatibility
              </button>
            </div>
            
            {migrationError && (
              <div className="text-red-500 mb-4">
                {migrationError}
              </div>
            )}

            {migrationMessages.length > 0 && (
              <div className={`${
                migrationMessages[0].includes('No compatible') 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-blue-50 border border-blue-200'
              } p-4 rounded-lg mb-4`}>
                {migrationMessages.map((message, index) => (
                  <p key={`migration-message-${index}`} className={
                    migrationMessages[0].includes('No compatible')
                      ? 'text-yellow-800'
                      : 'text-blue-800'
                  }>{message}</p>
                ))}
              </div>
            )}

            {targetVersions && targetVersions.length > 0 && (
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="mb-2 font-medium">
                  {direction === 'community-to-server' ? 'Migration target:' : 'Migration target:'}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {migrationVersion && (
                    <div className={`px-4 py-2 rounded ${
                      direction === 'community-to-server' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {migrationVersion}
                      {LTA_SERVER_VERSIONS.includes(getBaseLTAVersion(migrationVersion)) && (
                        <span className="ml-1 text-xs">(LTA)</span>
                      )}
                    </div>
                  )}
                  {migrationVersion && <ChevronRight className="text-gray-400" size={20} />}
                  {targetVersions.map((ver, index) => (
                    <React.Fragment key={ver}>
                      <div className={`px-4 py-2 rounded ${
                        direction === 'community-to-server'
                          ? (LTA_SERVER_VERSIONS.includes(getBaseLTAVersion(ver))
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800')
                          : (DECEMBER_RELEASES[ver]
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-blue-100 text-blue-800')
                      }`}>
                        {ver}
                        {LTA_SERVER_VERSIONS.includes(getBaseLTAVersion(ver)) && (
                          <span className="ml-1 text-xs">(LTA)</span>
                        )}
                        {DECEMBER_RELEASES[ver] && (
                          <span className="ml-1 text-xs">(December Release)</span>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                {migrationVersion && RELEASE_DATES[migrationVersion] && (
                  <div className="mt-4 text-sm text-gray-600">
                    {direction === 'community-to-server' 
                      ? `Community Build ${migrationVersion} release date: ` 
                      : `Server ${migrationVersion} release date: `}
                    {RELEASE_DATES[migrationVersion].toISOString().split('T')[0]}
                  </div>
                )}
                {targetVersions.map(ver => (
                  RELEASE_DATES[ver] && (
                    <div key={`date-${ver}`} className="text-sm text-gray-600">
                      {direction === 'community-to-server' 
                        ? `Server ${ver} release date: ` 
                        : `Community Build ${ver} release date: `}
                      {RELEASE_DATES[ver].toISOString().split('T')[0]}
                    </div>
                  )
                ))}
              </div>
            )}
            
            {targetVersions && targetVersions.length > 0 && (
              <button 
                onClick={() => {
                  if (targetVersions) {
                    const directionText = direction === 'community-to-server' 
                      ? `From Community Build ${migrationVersion} to: ${targetVersions.join(" → ")}` 
                      : `From Server ${migrationVersion} to: ${targetVersions.join(" or ")}`;
                    navigator.clipboard.writeText(directionText);
                  }
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Copy Result
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-4 border-t text-sm text-gray-500">
        <p>This tool helps you plan your SonarQube upgrade paths and migrations. Always refer to the <a href="https://docs.sonarsource.com/sonarqube-server/latest/server-upgrade-and-maintenance/upgrade/roadmap/" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">official SonarQube upgrade guide</a> for detailed instructions.</p>
      </div>
    </div>
  );
};

export default UpgradePathCalculator;
