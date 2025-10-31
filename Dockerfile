# Use a standard PHP image with Apache
FROM php:8.1-apache

# Copy the proxy_loader.php file into the web root
COPY proxy_loader.php /var/www/html/

# Enable the rewrite module (optional)
RUN a2enmod rewrite

# Expose port 80 (Apache default)
EXPOSE 80

# Command to start Apache
CMD ["apache2-foreground"]
