/* eslint-disable */
"use client";

import React, { useState, ChangeEvent } from 'react';
import { ChevronRight, Layers, GitPullRequest } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

type Edition = 'community' | 'developer' | 'enterprise' | 'datacenter';
type CalculatorType = 'version-upgrade' | 'edition-migration';
type UpgradeDirection = 'community-to-server' | 'server-to-community';

interface UpgradePath {
  path: string[];
  messages: string[];
}

interface UpgradeResult {
  targetVersions: string[];
  messages: string[];
}

interface VersionInfo {
  version: string;
  isLTA?: boolean;
  isDecemberRelease?: boolean;
  releaseDate?: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VERSIONS = {
  standard: [
    "6.7", "6.7.1", "6.7.2", "6.7.3", "6.7.4", "6.7.5", "6.7.6", "6.7.7",
    "7.0", "7.1", "7.2", "7.2.1", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8",
    "7.9", "7.9.1", "7.9.2", "7.9.3", "7.9.4", "7.9.5", "7.9.6",
    "8.0", "8.1", "8.2", "8.3", "8.3.1", "8.4", "8.4.1", "8.4.2",
    "8.5", "8.5.1", "8.6", "8.6.1", "8.7", "8.7.1", "8.8",
    "8.9", "8.9.1", "8.9.2", "8.9.3", "8.9.4", "8.9.5", "8.9.6", "8.9.7", "8.9.8", "8.9.9", "8.9.10",
    "9.0", "9.0.1", "9.1", "9.2", "9.2.1", "9.2.2", "9.2.3", "9.2.4", "9.3", "9.4", "9.5", "9.6", "9.6.1",
    "9.7", "9.7.1", "9.8", "9.9", "9.9.1", "9.9.2", "9.9.3", "9.9.4", "9.9.5", "9.9.6", "9.9.7", "9.9.8",
    "10.0", "10.1", "10.2", "10.2.1", "10.3", "10.4", "10.4.1", "10.5", "10.5.1",
    "10.6", "10.7", "10.8", "10.8.1",
    "2025.1", "2025.1.1", "2025.1.2", "2025.1.3", "2025.2", "2025.3", "2025.3.1", "2025.4.0", "2025.4.1"
  ],
  communityBuild: ["24.12", "25.1", "25.2", "25.3", "25.4", "25.5", "25.6","25.7"],
  server: ["2025.1", "2025.1.1", "2025.1.2", "2025.1.3", "2025.2", "2025.3", "2025.3.1", "2025.4.0", "2025.4.1"]
};

const LTA_VERSIONS = new Set(["6.7", "7.9", "8.9", "9.9", "2025.1"]);
const DECEMBER_RELEASES = new Set(["24.12"]);
const LTA_SERVER_VERSIONS = new Set(["2025.1"]);

const RELEASE_DATES: Record<string, Date> = {
  "24.12": new Date("2024-12-02"),
  "25.1": new Date("2025-01-07"),
  "25.2": new Date("2025-02-03"),
  "25.3": new Date("2025-03-04"),
  "25.4": new Date("2025-04-07"),
  "25.5": new Date("2025-05-09"),
  "25.6": new Date("2025-06-02"),
  "25.7": new Date("2025-07-07"),
  "2025.1": new Date("2025-01-23"),
  "2025.1.1": new Date("2025-01-23"),
  "2025.1.2": new Date("2025-01-23"),
  "2025.1.3": new Date("2025-01-23"),
  "2025.2": new Date("2025-03-26"),
  "2025.3": new Date("2025-05-29"),
  "2025.3.1": new Date("2025-05-29"),
  "2025.4.0": new Date("2025-07-31"),
  "2025.4.1": new Date("2025-07-31")
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const versionUtils = {
  compare: (v1: string, v2: string): number => {
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
  },

  normalize: (version: string): string => {
    const parts = version.split('.');
    return parts.length === 2 ? `${parts[0]}.${parts[1]}.0` : version;
  },

  getBaseLTA: (version: string): string => {
    return version.split('.').slice(0, 2).join('.');
  },

  isLTAPatch: (version: string): boolean => {
    const baseVersion = versionUtils.getBaseLTA(version);
    return LTA_VERSIONS.has(baseVersion) && version !== baseVersion;
  },

  isCommunityBuild: (version: string): boolean => {
    const major = Number(version.split('.')[0]);
    return major >= 24 && major < 2024;
  },

  isServerVersion: (version: string): boolean => {
    const major = Number(version.split('.')[0]);
    return major >= 2025;
  },

  getLatestPatch: (majorMinor: string): string => {
    return VERSIONS.standard
      .filter(v => v.startsWith(majorMinor + '.'))
      .sort((a, b) => versionUtils.compare(a, b))
      .pop() ?? majorMinor;
  },

  getLatest: (isCommunityBuild = false): string => {
    const versions = isCommunityBuild ? VERSIONS.communityBuild : VERSIONS.standard;
    return versions[versions.length - 1];
  },

  isValid: (version: string, edition: Edition): boolean => {
    if (edition === 'community') {
      return VERSIONS.standard.includes(version) || VERSIONS.communityBuild.includes(version);
    }
    return VERSIONS.standard.includes(version);
  }
};

// ============================================================================
// UPGRADE PATH LOGIC
// ============================================================================

class UpgradePathCalculator {
  static calculate(startVersion: string, edition: Edition): UpgradePath | null {
    const path: string[] = [startVersion];
    const messages: string[] = [];
    
    if (!versionUtils.isValid(startVersion, edition)) {
      return null;
    }

    // Check if already at latest
    const isLatest = startVersion === versionUtils.getLatest(edition === "community");
    if (isLatest) {
      return { path, messages: ["You're already using the latest version of SonarQube!"] };
    }

    // Handle special LTA cases
    if (this.handleCurrentLTA(startVersion, edition, path, messages)) {
      return { path, messages };
    }

    // Calculate path based on edition
    if (edition === "community") {
      this.calculateCommunityPath(startVersion, path, messages);
    } else {
      this.calculateCommercialPath(startVersion, path, messages);
    }

    return { path: [...new Set(path)], messages };
  }

  private static handleCurrentLTA(
    version: string, 
    edition: Edition, 
    path: string[], 
    messages: string[]
  ): boolean {
    const baseLTA = versionUtils.getBaseLTA(version);
    const latestLTA = "2025.1";
    
    if (baseLTA === latestLTA && edition !== "community" && 
        (version === "2025.1" || version === "2025.1.1" || version === "2025.1.2")) {
      const latestPatch = versionUtils.getLatestPatch(baseLTA);
      const latestOverall = versionUtils.getLatest();
      
      path.push(latestPatch, latestOverall);
      messages.push(
        "Upgrading to the latest LTA patch (2025.1.3) is recommended for stability, " +
        "but you can also upgrade directly to 2025.4.1 if you prefer newer features."
      );
      return true;
    }
    return false;
  }

  private static calculateCommunityPath(
    startVersion: string, 
    path: string[], 
    messages: string[]
  ): void {
    const isCommunityBuild = versionUtils.isCommunityBuild(startVersion);
    
    if (!isCommunityBuild) {
      // Legacy Community Edition path
      this.addLTASteps(startVersion, "10.0", path);
      messages.push(
        "Note: After 10.7, Community Edition has been renamed to Community Build " +
        "with a new versioning scheme."
      );
      
      // Transition to Community Build
      const firstCommunityBuild = VERSIONS.communityBuild[0];
      path.push(firstCommunityBuild);
      
      // Continue to latest if needed
      const latest = versionUtils.getLatest(true);
      if (firstCommunityBuild !== latest) {
        this.addDecemberReleaseIfNeeded(firstCommunityBuild, latest, path, messages);
        path.push(latest);
      }
    } else {
      // Community Build to Community Build
      const latest = versionUtils.getLatest(true);
      if (startVersion !== latest) {
        this.addDecemberReleaseIfNeeded(startVersion, latest, path, messages);
        if (path[path.length - 1] !== latest) {
          path.push(latest);
        }
      }
    }
  }

  private static calculateCommercialPath(
    startVersion: string, 
    path: string[], 
    messages: string[]
  ): void {
    // Check if after last LTA
    const availableLTAs = Array.from(LTA_VERSIONS)
      .filter(lta => VERSIONS.standard.some(v => v.startsWith(lta)))
      .sort((a, b) => versionUtils.compare(b, a));
    
    if (availableLTAs.length > 0) {
      const lastLTA = availableLTAs[0];
      if (versionUtils.compare(startVersion, lastLTA) >= 0) {
        const latest = versionUtils.getLatest();
        if (startVersion !== latest) {
          path.push(latest);
        }
        return;
      }
    }

    // Add LTA steps
    this.addLTASteps(startVersion, null, path);
    path.push(versionUtils.getLatest());
  }

  private static addLTASteps(
    startVersion: string, 
    maxVersion: string | null, 
    path: string[]
  ): void {
    Array.from(LTA_VERSIONS)
      .filter(lta => {
        const afterStart = versionUtils.compare(lta, startVersion) > 0;
        const beforeMax = !maxVersion || versionUtils.compare(lta, maxVersion) < 0;
        return afterStart && beforeMax;
      })
      .sort((a, b) => versionUtils.compare(a, b))
      .forEach(lta => path.push(versionUtils.getLatestPatch(lta)));
  }

  private static addDecemberReleaseIfNeeded(
    start: string, 
    target: string, 
    path: string[], 
    messages: string[]
  ): void {
    if (DECEMBER_RELEASES.has(start)) return;
    
    const [startYear] = start.split('.').map(Number);
    const [targetYear] = target.split('.').map(Number);
    const [, startMonth] = start.split('.').map(Number);
    
    if (targetYear > startYear && startMonth < 12) {
      const decemberRelease = Array.from(DECEMBER_RELEASES)
        .sort((a, b) => versionUtils.compare(b, a))[0];
      
      if (decemberRelease && versionUtils.compare(decemberRelease, start) > 0) {
        path.push(decemberRelease);
        messages.push("Note: Upgrading through the December release is required for Community Build.");
      }
    }
  }
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

class MigrationCalculator {
  static findEligibleVersions(version: string, direction: UpgradeDirection): UpgradeResult {
    if (direction === 'community-to-server') {
      return this.communityToServer(version);
    }
    return this.serverToCommunity(version);
  }

  private static communityToServer(communityVersion: string): UpgradeResult {
    const messages: string[] = [];
    const targetVersions: string[] = [];

    // Legacy Community Edition
    if (communityVersion.startsWith("9.9") || communityVersion.startsWith("10.")) {
      const latestLTAPatch = versionUtils.getLatestPatch("2025.1");
      targetVersions.push(latestLTAPatch);
      messages.push(
        `Legacy Community Edition (9.9.x - 10.8.x) should migrate to the latest LTA patch (${latestLTAPatch}).`,
        "After migrating, use the Version Upgrade Path calculator to continue upgrading."
      );
      return { targetVersions, messages };
    }

    // Community Build versions
    const communityDate = RELEASE_DATES[communityVersion];
    if (!communityDate) {
      return { targetVersions: [], messages: ["Unknown version or release date."] };
    }

    // Check against current LTA
    const currentLTA = "2025.1";
    const ltaDate = RELEASE_DATES[currentLTA];
    
    if (ltaDate && communityDate < ltaDate) {
      const latestLTAPatch = versionUtils.getLatestPatch(currentLTA);
      targetVersions.push(latestLTAPatch);
      messages.push(
        `Community Build ${communityVersion} (released before the current LTA) should migrate to the latest LTA patch (${latestLTAPatch}).`,
        "After migrating, use the Version Upgrade Path calculator to continue upgrading."
      );
      return { targetVersions, messages };
    }

    // Find eligible server versions
    const eligible = VERSIONS.server
      .filter(v => {
        const serverDate = RELEASE_DATES[v];
        return serverDate && serverDate > communityDate;
      })
      .sort((a, b) => versionUtils.compare(a, b));

    if (eligible.length === 0) {
      return { 
        targetVersions: [], 
        messages: ["No compatible SonarQube Server version is available yet. Please wait for the next Server release."] 
      };
    }

    // Get the appropriate target
    const latest = eligible[eligible.length - 1];
    const baseLTA = versionUtils.getBaseLTA(latest);
    const target = LTA_SERVER_VERSIONS.has(baseLTA) 
      ? versionUtils.getLatestPatch(baseLTA) 
      : latest;

    targetVersions.push(target);
    messages.push(`Community Build ${communityVersion} should migrate to Server ${target}.`);
    
    if (target !== VERSIONS.server[VERSIONS.server.length - 1]) {
      messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");
    }

    return { targetVersions, messages };
  }

  private static serverToCommunity(serverVersion: string): UpgradeResult {
    const messages: string[] = [];
    const targetVersions: string[] = [];
    
    const serverDate = RELEASE_DATES[serverVersion];
    if (!serverDate) {
      return { targetVersions: [], messages: ["Unknown version or release date."] };
    }

    // Find compatible Community Build versions
    const compatible = VERSIONS.communityBuild
      .filter(v => {
        const communityDate = RELEASE_DATES[v];
        return communityDate && communityDate > serverDate;
      })
      .sort((a, b) => versionUtils.compare(b, a));

    if (compatible.length === 0) {
      return { 
        targetVersions: [], 
        messages: ["No compatible Community Build version is available yet. Please wait for the next Community Build release."] 
      };
    }

    const target = compatible[0];
    targetVersions.push(target);
    messages.push(`Server ${serverVersion} can migrate to Community Build ${target}.`);
    
    if (DECEMBER_RELEASES.has(target)) {
      messages.push("Note: This is a December release, which will be a required milestone for future Community Build upgrades.");
    }
    
    messages.push("After migrating, use the Version Upgrade Path calculator to continue upgrading.");

    return { targetVersions, messages };
  }
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

interface InfoCardProps {
  type: 'version-upgrade' | 'edition-migration';
}

const InfoCard: React.FC<InfoCardProps> = ({ type }) => (
  <Card className="bg-blue-50">
    <CardContent className="pt-6">
      <div className="space-y-2">
        <p><strong>{type === 'version-upgrade' ? 'Key things to know:' : 'Important information:'}</strong></p>
        <ul className="list-disc pl-6 space-y-2">
          {type === 'version-upgrade' ? (
            <>
              <li>LTA (Long Term Active) versions are special releases that you must upgrade through. You cannot skip over an LTA version when upgrading.</li>
              <li>Community Edition has been renamed to Community Build starting after version 10.7, with a new versioning scheme (24.12 and later).</li>
              <li>December releases (like 24.12) are required milestones when upgrading Community Build. You cannot skip over a December release when upgrading Community Build.</li>
            </>
          ) : (
            <>
              <li>Legacy Community Edition (9.9.x - 10.8.x) must upgrade through the latest LTA patch (2025.1.3) before moving to later Server versions.</li>
              <li>Legacy Community Edition users can also switch to the same version of a commercial edition and continue the upgrade path from there.</li>
              <li>Newer Community Build versions (24.12 and later) can only upgrade to Server versions released <strong>after</strong> them.</li>
              <li>When upgrading, you must always go through the latest LTA patch before upgrading to non-LTA versions.</li>
              <li>SonarQube Server can only migrate to Community Build versions released <strong>after</strong> it.</li>
              <li>If no compatible version exists, you'll need to wait for the next release.</li>
            </>
          )}
        </ul>
      </div>
    </CardContent>
  </Card>
);

interface VersionBadgeProps {
  version: string;
  type?: 'recommended' | 'optional';
  isLTA?: boolean;
  isDecemberRelease?: boolean;
}

const VersionBadge: React.FC<VersionBadgeProps> = ({ version, type, isLTA, isDecemberRelease }) => {
  const baseClasses = "px-4 py-2 rounded";
  const colorClasses = isLTA
    ? 'bg-yellow-100 text-yellow-800'
    : isDecemberRelease
      ? 'bg-blue-200 text-blue-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      {version}
      {isLTA && <span className="ml-1 text-xs">(LTA)</span>}
      {isDecemberRelease && <span className="ml-1 text-xs">(December Release)</span>}
      {type === 'recommended' && <span className="ml-1 text-xs">(recommended)</span>}
      {type === 'optional' && <span className="ml-1 text-xs">(optional)</span>}
    </div>
  );
};

interface MessageBoxProps {
  messages: string[];
  type?: 'success' | 'info' | 'warning';
}

const MessageBox: React.FC<MessageBoxProps> = ({ messages, type = 'info' }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`p-4 rounded-lg mb-4 ${getStyles()}`}>
      {messages.map((message, index) => (
        <p key={index} className={message.startsWith('•') ? 'ml-4' : ''}>
          {message}
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SonarQubeCalculator: React.FC = () => {
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('version-upgrade');
  
  // Version upgrade state
  const [version, setVersion] = useState('');
  const [edition, setEdition] = useState<Edition>('community');
  const [path, setPath] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Migration state
  const [migrationVersion, setMigrationVersion] = useState('');
  const [direction, setDirection] = useState<UpgradeDirection>('community-to-server');
  const [targetVersions, setTargetVersions] = useState<string[] | null>(null);
  const [migrationMessages, setMigrationMessages] = useState<string[]>([]);
  const [migrationError, setMigrationError] = useState('');

  const resetState = () => {
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

  const handleCalculatorTypeChange = (type: CalculatorType) => {
    setCalculatorType(type);
    resetState();
  };

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
    
    // Clear incompatible versions
    if (version) {
      const isCommunityBuild = versionUtils.isCommunityBuild(version);
      const isServer = versionUtils.isServerVersion(version);
      
      if ((newEdition === 'community' && isServer) || 
          (newEdition !== 'community' && isCommunityBuild)) {
        setVersion('');
      }
    }
  };

  const calculatePath = () => {
    if (!version) {
      setError('Please enter a version');
      return;
    }

    // Validate edition compatibility
    const isCommunityBuild = versionUtils.isCommunityBuild(version);
    const isServer = versionUtils.isServerVersion(version);
    
    if (edition === 'community' && isServer) {
      setError('Server versions (2025.x) are not available for Community edition. Please select a different edition.');
      return;
    }
    if (edition !== 'community' && isCommunityBuild) {
      setError('Community Build versions are only available for Community edition. Please select Community edition.');
      return;
    }

    const result = UpgradePathCalculator.calculate(version, edition);
    if (!result) {
      setError('Invalid version. Please enter a valid SonarQube version.');
      return;
    }

    setError('');
    setPath(result.path);
    setMessages(result.messages);
  };

  const calculateMigration = () => {
    if (!migrationVersion) {
      setMigrationError('Please select a version');
      return;
    }

    const result = MigrationCalculator.findEligibleVersions(migrationVersion, direction);
    setTargetVersions(result.targetVersions);
    setMigrationMessages(result.messages);
    setMigrationError('');
  };

  const getVersionOptions = () => {
    if (edition === "community") {
      return (
        <>
          <optgroup label="Community Edition">
            {VERSIONS.standard
              .filter(ver => {
                const [major, minor] = ver.split('.').map(Number);
                return major < 10 || (major === 10 && minor <= 8);
              })
              .map(ver => (
                <option key={ver} value={ver}>{ver}</option>
              ))}
          </optgroup>
          <optgroup label="Community Build">
            {VERSIONS.communityBuild.map(ver => (
              <option key={ver} value={ver}>{ver}</option>
            ))}
          </optgroup>
        </>
      );
    }
    
    return VERSIONS.standard.map(ver => (
      <option key={ver} value={ver}>{ver}</option>
    ));
  };

  const renderUpgradePath = () => {
    if (!path) return null;

    return (
      <div className="bg-blue-50 p-6 rounded-lg">
        <div className="flex flex-wrap gap-2 items-center">
          {path.map((ver, index) => {
            const baseLTA = versionUtils.getBaseLTA(ver);
            const isLTA = LTA_VERSIONS.has(baseLTA);
            const isDecemberRelease = DECEMBER_RELEASES.has(ver);
            
            // Check for recommended/optional badges
            let badgeType: 'recommended' | 'optional' | undefined;
            if (ver === "2025.1.3" && (path[0] === "2025.1" || path[0] === "2025.1.1" || path[0] === "2025.1.2")) {
              badgeType = 'recommended';
            } else if (edition !== "community" && index === path.length - 1 && index > 0) {
              const prevVersion = path[index - 1];
              const prevBaseLTA = versionUtils.getBaseLTA(prevVersion);
              if (LTA_VERSIONS.has(prevBaseLTA) && !isLTA) {
                badgeType = 'optional';
              }
            }
            
            return (
              <React.Fragment key={ver}>
                <VersionBadge 
                  version={ver}
                  type={badgeType}
                  isLTA={isLTA}
                  isDecemberRelease={isDecemberRelease}
                />
                {index < path.length - 1 && (
                  <ChevronRight className="text-gray-400" size={20} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
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
          <>
            <InfoCard type="version-upgrade" />
            
            <h2 className="text-2xl font-bold">Calculate Your Upgrade Path</h2>
            
            <div className="flex gap-4 mb-4">
              <select
                value={version}
                onChange={handleVersionChange}
                className="flex-grow p-2 border rounded"
              >
                <option value="">Select version...</option>
                {getVersionOptions()}
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
              <div className="text-red-500 mb-4">{error}</div>
            )}

            {messages.length > 0 && (
              <MessageBox 
                messages={messages}
                type={messages[0].includes('latest version') ? 'success' : 'info'}
              />
            )}

            {renderUpgradePath()}
            
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
          <>
            <InfoCard type="edition-migration" />

            <h2 className="text-2xl font-bold">Edition Migration Calculator</h2>
            
            <div className="flex gap-4 mb-4">
              <select
                value={direction}
                onChange={(e) => {
                  setDirection(e.target.value as UpgradeDirection);
                  setMigrationVersion('');
                  setMigrationError('');
                  setTargetVersions(null);
                  setMigrationMessages([]);
                }}
                className="p-2 border rounded"
              >
                <option value="community-to-server">Community Build to Server</option>
                <option value="server-to-community">Server to Community Build</option>
              </select>
            </div>
            
            <div className="flex gap-4 mb-4">
              <select
                value={migrationVersion}
                onChange={(e) => {
                  setMigrationVersion(e.target.value);
                  setMigrationError('');
                  setTargetVersions(null);
                  setMigrationMessages([]);
                }}
                className="flex-grow p-2 border rounded"
              >
                {direction === 'community-to-server' ? (
                  <>
                    <option value="">Select Community Build version...</option>
                    <optgroup label="Legacy Community Edition">
                      {[...VERSIONS.standard
                        .filter(v => v.startsWith("9.9") || v.startsWith("10."))
                        .filter(v => {
                          const [major, minor] = v.split('.').map(Number);
                          return major < 10 || (major === 10 && minor <= 8);
                        }),
                        ...VERSIONS.communityBuild
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .filter(v => v.startsWith("9") || v.startsWith("10"))
                        .map(ver => (
                          <option key={ver} value={ver}>{ver}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Community Build">
                      {VERSIONS.communityBuild.map(ver => (
                        <option key={ver} value={ver}>{ver}</option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <option value="">Select Server version...</option>
                    {VERSIONS.server.map(ver => (
                      <option key={ver} value={ver}>
                        {ver} {LTA_SERVER_VERSIONS.has(versionUtils.getBaseLTA(ver)) && '(LTA)'}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <button
                onClick={calculateMigration}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Check Compatibility
              </button>
            </div>
            
            {migrationError && (
              <div className="text-red-500 mb-4">{migrationError}</div>
            )}

            {migrationMessages.length > 0 && (
              <MessageBox 
                messages={migrationMessages}
                type={migrationMessages[0].includes('No compatible') ? 'warning' : 'info'}
              />
            )}

            {targetVersions && targetVersions.length > 0 && (
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="mb-2 font-medium">Migration target:</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {migrationVersion && (
                    <div className={`px-4 py-2 rounded ${
                      direction === 'community-to-server' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {migrationVersion}
                      {LTA_SERVER_VERSIONS.has(versionUtils.getBaseLTA(migrationVersion)) && (
                        <span className="ml-1 text-xs">(LTA)</span>
                      )}
                    </div>
                  )}
                  {migrationVersion && <ChevronRight className="text-gray-400" size={20} />}
                  {targetVersions.map((ver) => (
                    <VersionBadge
                      key={ver}
                      version={ver}
                      isLTA={LTA_SERVER_VERSIONS.has(versionUtils.getBaseLTA(ver))}
                      isDecemberRelease={DECEMBER_RELEASES.has(ver)}
                    />
                  ))}
                </div>
                
                {/* Show release dates */}
                <div className="mt-4 space-y-1">
                  {migrationVersion && RELEASE_DATES[migrationVersion] && (
                    <div className="text-sm text-gray-600">
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

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-sm text-gray-500">
        <p>
          This tool helps you plan your SonarQube upgrade paths and migrations. Always refer to the{' '}
          <a 
            href="https://docs.sonarsource.com/sonarqube-server/latest/server-upgrade-and-maintenance/upgrade/roadmap/" 
            className="text-blue-500 hover:underline" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            official SonarQube upgrade guide
          </a>{' '}
          for detailed instructions.
        </p>
      </div>
    </div>
  );
};

export default SonarQubeCalculator;
