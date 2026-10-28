/** Include current roster and people with records in the authorized matrix. */
export function attendanceExportProfiles(enrollments: any[], meetings: any[]): any[] {
  const profiles = new Map<string, any>();
  for (const enrollment of enrollments) {
    const profile = enrollment.catechumenProfile;
    if (profile) profiles.set(profile.id, profile);
  }
  for (const meeting of meetings) {
    for (const record of meeting.attendance ?? []) {
      const profile = record.catechumenProfile;
      if (profile) profiles.set(profile.id, profile);
    }
  }
  return [...profiles.values()];
}
