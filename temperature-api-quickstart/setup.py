from setuptools import setup, find_packages

setup(
    name="fortyguard",
    version="1.0.0",
    description="FortyGuard Temperature API Client SDK",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
    ],
)
