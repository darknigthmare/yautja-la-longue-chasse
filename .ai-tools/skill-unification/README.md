# Harmonisation des skills d’agents IA

Ces catalogues facultatifs servent au travail local. Les compétences existantes restent prioritaires.

- GameDev Agent Skills (Apache-2.0) fournit les références de développement et le routeur dans `.ai-tools/gamedev-skills/upstream/`. [Révision épinglée](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/c6ca6c41c839b68319ffc08430b99ab768debc32)
- 3Dviz Pro Max (MIT) fournit les références, données, scripts et modèles dans `.ai-tools/3dviz-pro-max/upstream/`. [Révision épinglée](https://github.com/viettranx/3dviz-pro-max/tree/d077e0e68915c25be8e71d74684d3144fd1c2aca)
- Le guide Spec Kit s’appuie sur les installations dont `.specify/` est déjà présent.

## Utiliser les guides localement

Si le catalogue est utile à la tâche et que son dossier est absent, exécuter le bloc concerné à la racine du projet. Les dossiers locaux sont ignorés par Git et par Vercel.

```sh
git init .ai-tools/gamedev-skills/upstream
git -C .ai-tools/gamedev-skills/upstream fetch --depth=1 https://github.com/gamedev-skills/awesome-gamedev-agent-skills.git c6ca6c41c839b68319ffc08430b99ab768debc32
git -C .ai-tools/gamedev-skills/upstream checkout --detach c6ca6c41c839b68319ffc08430b99ab768debc32
```

```sh
git init .ai-tools/3dviz-pro-max/upstream
git -C .ai-tools/3dviz-pro-max/upstream fetch --depth=1 https://github.com/viettranx/3dviz-pro-max.git d077e0e68915c25be8e71d74684d3144fd1c2aca
git -C .ai-tools/3dviz-pro-max/upstream checkout --detach d077e0e68915c25be8e71d74684d3144fd1c2aca
```

Si un dossier existe déjà, vérifier sa révision avec `git -C <dossier> rev-parse HEAD` avant de suivre les références.
