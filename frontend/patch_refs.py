import os
import re

matches_dir = r"c:\Users\Felipe\Desktop\app-esportivo\backend\frontend\src\pages\Matches"

for filename in os.listdir(matches_dir):
    if filename.startswith("Sumula") and filename.endswith(".tsx"):
        filepath = os.path.join(matches_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 1. Add getPendingCount to destructuring
        if 'getPendingCount' not in content:
            content = re.sub(r'(pendingCount\s*)\}\s*=\s*useOfflineResilience', r'\1, getPendingCount } = useOfflineResilience', content)
        
        # 2. Replace pendingCount with getPendingCount() inside intervals / ping sync rules
        content = content.replace('if (!pendingCount || pendingCount === 0)', 'if (getPendingCount() === 0)')
        content = content.replace('if (pendingCount === 0)', 'if (getPendingCount() === 0)')
        content = content.replace('if (isOnline && pendingCount === 0)', 'if (isOnline && getPendingCount() === 0)')
        content = content.replace('if (!isOnline || pendingCount > 0) return;', 'if (!isOnline || getPendingCount() > 0) return;')

        # 3. Remove [id, pendingCount] -> [id]
        content = content.replace('[id, pendingCount]', '[id]')
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filename}")
