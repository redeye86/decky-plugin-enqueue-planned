import decky


class Plugin:
    async def _migration(self):
        decky.logger.info("[NQueue] migration start")

    async def _main(self):
        decky.logger.info("[NQueue] loaded")

    async def _unload(self):
        decky.logger.info("[NQueue] unloaded")

    async def _uninstall(self):
        decky.logger.info("[NQueue] uninstalled")
