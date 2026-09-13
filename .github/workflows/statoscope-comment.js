module.exports = ({ initialSize, bundleSize, validation, prNumber, diffReportUrl }) => `**📦 Statoscope quick diff with master branch:**

**⚖️ Initial size:** ${initialSize.diff.percent > 1.5 ? '🔴' : (initialSize.diff.percent < 0 ? '🟢' : '⚪️')} ${initialSize.diff.value >= 0 ? '+' : ''}${initialSize.diff.formatted}

**⚖️ Total bundle size:** ${bundleSize.diff.percent > 1.5 ? '🔴' : (bundleSize.diff.percent < 0 ? '🟢' : '⚪️')} ${bundleSize.diff.value >= 0 ? '+' : ''}${bundleSize.diff.formatted}

**🕵️ Validation errors:** ${validation.total > 0 ? validation.total : '✅'}

Full Statoscope report could be found [here️](https://deploy-preview-${prNumber}--ionwallet-e5kxpi8iga.netlify.app/statoscope-report.html) / [diff](${diffReportUrl})
`;
