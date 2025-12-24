/**
 * defaultLayouts.js
 * Default EspoCRM layout templates for entities
 * Used to restore layouts when they get corrupted or to ensure standard fields are preserved
 */

export const DEFAULT_LAYOUTS = {
  Lead: {
    list: [
      { name: "name", link: true, width: 20 },
      { name: "status", width: 12 },
      { name: "emailAddress", width: 18 },
      { name: "phoneNumber", width: 15 },
      { name: "accountName", link: true, width: 15 },
      { name: "assignedUser", width: 12 },
      { name: "createdAt", width: 10 }
    ],

    detail: [
      {
        label: "Overview",
        rows: [
          [{ name: "salutationName" }, false],
          [{ name: "firstName" }, { name: "lastName" }],
          [{ name: "status" }, { name: "source" }],
          [{ name: "title" }, { name: "website" }],
          [{ name: "emailAddress" }, { name: "phoneNumber" }],
          [{ name: "accountName" }, { name: "doNotCall" }],
          [{ name: "industry" }, { name: "opportunityAmount" }],
          [{ name: "description", fullWidth: true }]
        ]
      },
      {
        label: "Address",
        rows: [
          [{ name: "addressStreet", fullWidth: true }],
          [{ name: "addressCity" }, { name: "addressState" }],
          [{ name: "addressPostalCode" }, { name: "addressCountry" }]
        ]
      },
      {
        label: "Additional Information",
        rows: [
          [{ name: "assignedUser" }, { name: "teams" }],
          [{ name: "createdAt" }, { name: "modifiedAt" }],
          [{ name: "createdBy" }, { name: "modifiedBy" }]
        ]
      }
    ],

    detailSmall: [
      {
        rows: [
          [{ name: "salutationName" }, false],
          [{ name: "firstName" }, { name: "lastName" }],
          [{ name: "status" }, { name: "source" }],
          [{ name: "emailAddress" }, { name: "phoneNumber" }],
          [{ name: "accountName" }, { name: "website" }],
          [{ name: "assignedUser" }, false]
        ]
      }
    ]
  }
};

/**
 * Get default layout for an entity
 * @param {string} entity - Entity name (e.g., "Lead", "Contact")
 * @param {string} layoutType - Layout type (e.g., "detail", "list", "detailSmall")
 * @returns {object|null} - Default layout or null if not found
 */
export function getDefaultLayout(entity, layoutType) {
  if (DEFAULT_LAYOUTS[entity] && DEFAULT_LAYOUTS[entity][layoutType]) {
    // Return a deep copy to avoid mutations
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUTS[entity][layoutType]));
  }
  return null;
}

/**
 * Check if a layout has the default fields (to detect if it was corrupted)
 * @param {object} layout - Current layout
 * @param {string} entity - Entity name
 * @param {string} layoutType - Layout type
 * @returns {boolean} - True if layout seems valid
 */
export function isLayoutValid(layout, entity, layoutType) {
  if (!layout) return false;

  if (layoutType === 'list') {
    // List should have at least "name" field
    return Array.isArray(layout) && layout.length > 0 && layout.some(field => field.name === 'name');
  }

  if (layoutType === 'detail' || layoutType === 'detailSmall') {
    // Detail should have panels with rows
    return Array.isArray(layout) &&
           layout.length > 0 &&
           layout[0].rows &&
           Array.isArray(layout[0].rows) &&
           layout[0].rows.length > 0;
  }

  return false;
}

/**
 * Merge custom fields into default layout
 * @param {object} defaultLayout - Default layout template
 * @param {string[]} customFields - Array of custom field names to add
 * @param {string} layoutType - Layout type
 * @returns {object} - Merged layout
 */
export function mergeCustomFields(defaultLayout, customFields, layoutType) {
  const merged = JSON.parse(JSON.stringify(defaultLayout));

  if (layoutType === 'list') {
    // Add custom fields to list (skip if already exists)
    for (const fieldName of customFields) {
      if (!merged.some(f => f.name === fieldName)) {
        merged.push({ name: fieldName, width: 15 });
      }
    }
  }

  if (layoutType === 'detail') {
    // Add custom fields to first panel, last position
    if (merged[0] && merged[0].rows) {
      for (const fieldName of customFields) {
        // Check if already exists
        const exists = merged[0].rows.some(row =>
          row.some(cell => cell && cell.name === fieldName)
        );

        if (!exists) {
          merged[0].rows.push([{ name: fieldName, fullWidth: true }, false]);
        }
      }
    }
  }

  if (layoutType === 'detailSmall') {
    // Add custom fields to first panel
    if (merged[0] && merged[0].rows) {
      for (const fieldName of customFields) {
        const exists = merged[0].rows.some(row =>
          row.some(cell => cell && cell.name === fieldName)
        );

        if (!exists) {
          merged[0].rows.push([{ name: fieldName }, false]);
        }
      }
    }
  }

  return merged;
}
